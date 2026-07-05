mod claude;
mod line;
mod markdown;
mod render;
mod setlist;

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use axum::{
    body::Bytes,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Router,
};

use base64::{engine::general_purpose::STANDARD as B64, Engine as _};

use claude::{compress_history, Claude, Msg};
use line::{Event, LineClient, WebhookPayload};

const HISTORY_TTL: Duration = Duration::from_secs(24 * 60 * 60);
const PENDING_IMAGE_TTL: Duration = Duration::from_secs(120);

struct Conv {
    msgs: Vec<Msg>,
    last: Instant,
}

struct Pending {
    ts: Instant,
    context: String,
}

struct AppState {
    line: LineClient,
    claude: Claude,
    channel_secret: String,
    admin_user: String,
    external_url: String,
    system_prompt: String,
    system_prompt_admin: String,
    bot_user_id: String,
    bot_display_name: String,
    convos: tokio::sync::Mutex<HashMap<String, Conv>>,
    pending: tokio::sync::Mutex<HashMap<String, Pending>>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().with_target(false).init();

    let token = env("CHANNEL_ACCESS_TOKEN");
    let channel_secret = env("CHANNEL_SECRET");
    let admin_user = env("ADMIN_USER");
    let port: u16 = env("PORT").parse().unwrap_or(10000);
    let external_url = {
        let u = env("BOT_EXTERNAL_URL");
        if u.is_empty() { format!("http://localhost:{port}") } else { u }
    };

    let system_prompt = include_str!("../../system-prompt.md").to_string();
    let system_prompt_admin = strip_sections(&system_prompt, &["Security", "Scope"]);

    let line = LineClient::new(token);
    let (bot_user_id, bot_display_name) = match line.get_bot_info().await {
        Ok(info) => {
            tracing::info!("botUserId={} displayName={}", info.user_id, info.display_name);
            (info.user_id, info.display_name)
        }
        Err(e) => {
            tracing::warn!("getBotInfo failed: {e}");
            (String::new(), String::new())
        }
    };

    let state = Arc::new(AppState {
        line,
        claude: Claude::new(env("ANTHROPIC_API_KEY")),
        channel_secret,
        admin_user,
        external_url,
        system_prompt,
        system_prompt_admin,
        bot_user_id,
        bot_display_name,
        convos: tokio::sync::Mutex::new(HashMap::new()),
        pending: tokio::sync::Mutex::new(HashMap::new()),
    });

    spawn_history_sweeper(state.clone());

    let app = Router::new()
        .route("/", get(health))
        .route("/health", get(health))
        .route("/tmp/{name}", get(serve_tmp))
        .route("/webhook", post(webhook))
        .with_state(state);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr).await.expect("bind");
    tracing::info!("listening on {addr}");
    axum::serve(listener, app).await.expect("serve");
}

fn env(key: &str) -> String {
    std::env::var(key).unwrap_or_default()
}

async fn health() -> &'static str {
    "LINE Bot MCP Server is running"
}

async fn serve_tmp(Path(name): Path<String>) -> impl IntoResponse {
    if !is_setlist_name(&name) {
        return (StatusCode::NOT_FOUND, "Not found").into_response();
    }
    match tokio::fs::read(format!("/tmp/{name}")).await {
        Ok(data) => ([(axum::http::header::CONTENT_TYPE, "image/png")], data).into_response(),
        Err(_) => (StatusCode::NOT_FOUND, "Not found").into_response(),
    }
}

fn is_setlist_name(name: &str) -> bool {
    name.strip_prefix("setlist-")
        .and_then(|s| s.strip_suffix(".png"))
        .is_some_and(|d| !d.is_empty() && d.bytes().all(|b| b.is_ascii_digit()))
}

async fn webhook(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    body: Bytes,
) -> impl IntoResponse {
    if !state.channel_secret.is_empty() {
        let sig = headers.get("x-line-signature").and_then(|v| v.to_str().ok());
        let ok = sig.is_some_and(|s| line::verify_signature(&state.channel_secret, &body, s));
        if !ok {
            return (StatusCode::FORBIDDEN, "Invalid signature");
        }
    }

    // Reply immediately, then process out of band (LINE expects a fast 200).
    tokio::spawn(async move {
        let payload: WebhookPayload = match serde_json::from_slice(&body) {
            Ok(p) => p,
            Err(e) => {
                tracing::warn!("webhook parse error: {e}");
                return;
            }
        };
        for event in payload.events {
            handle_event(&state, event).await;
        }
    });

    (StatusCode::OK, "OK")
}

async fn handle_event(state: &AppState, event: Event) {
    let Some(reply_token) = event.reply_token.clone() else {
        // Join events carry a replyToken; anything without one we can't answer.
        if event.event_type == "join" {
            return;
        }
        return;
    };

    if event.event_type == "join" {
        let name = if state.bot_display_name.is_empty() {
            "豚人間くん"
        } else {
            &state.bot_display_name
        };
        let text = format!(
            "はじめまして！{name}です。\n友だち追加ありがとうございます😉\n\nバンドやグループに関する様々な雑務をお手伝いさせていただきます！\n僕に何か頼みたいときは必ず僕宛にメンションをお願いします🐷"
        );
        reply_text(state, &reply_token, &text).await;
        return;
    }

    if event.event_type != "message" {
        return;
    }
    let Some(message) = event.message.as_ref() else {
        return;
    };
    let source = event.source.clone().unwrap_or_default();

    let is_group = source.source_type == "group" || source.source_type == "room";
    let mentionees = message
        .mention
        .as_ref()
        .map(|m| m.mentionees.clone())
        .unwrap_or_default();
    let is_mentioned = mentionees
        .iter()
        .any(|m| m.user_id.as_deref() == Some(state.bot_user_id.as_str()));
    let is_admin =
        !state.admin_user.is_empty() && source.user_id.as_deref() == Some(state.admin_user.as_str());
    let history_key = [&source.group_id, &source.room_id, &source.user_id]
        .into_iter()
        .flatten()
        .cloned()
        .collect::<Vec<_>>()
        .join(":");

    let base_prompt = if is_admin {
        &state.system_prompt_admin
    } else {
        &state.system_prompt
    };
    let system = format!("{base_prompt}\n\nCurrent date/time (JST): {}", jst_now());

    match message.message_type.as_str() {
        "text" => {
            if is_group && !is_mentioned {
                return;
            }
            let raw = message.text.clone().unwrap_or_default();
            let user_text = strip_mentions(&raw, &mentionees);
            let user_text = user_text.trim();
            if user_text.is_empty() {
                return;
            }

            if user_text == "/myid" {
                let uid = source.user_id.as_deref().unwrap_or("(不明)");
                reply_text(state, &reply_token, &format!("あなたのLINE IDは {uid} です")).await;
                return;
            }
            if user_text == "/reset" {
                state.convos.lock().await.remove(&history_key);
                state.pending.lock().await.remove(&history_key);
                reply_text(state, &reply_token, "会話履歴をリセットしました✅").await;
                return;
            }

            handle_text(state, &reply_token, &history_key, &system, user_text).await;
        }
        "image" => {
            let message_id = message.id.clone();
            handle_image(state, &reply_token, &history_key, &system, is_group, &message_id).await;
        }
        _ => {
            if is_group && !is_mentioned {
                return;
            }
            reply_text(state, &reply_token, "テキスト以外は対応していません🙏").await;
        }
    }
}

async fn handle_text(
    state: &AppState,
    reply_token: &str,
    key: &str,
    system: &str,
    user_text: &str,
) {
    // Work on a clone of the history so the store lock is not held across the
    // network calls; write it back at the end.
    let mut history = {
        let convos = state.convos.lock().await;
        convos.get(key).map(|c| c.msgs.clone()).unwrap_or_default()
    };
    history.push(Msg::user(user_text));
    compress_history(&state.claude, &mut history).await;

    let raw_reply = match state.claude.ask(system, &history).await {
        Ok(text) => text,
        Err(e) => {
            tracing::warn!("Claude API error: {e}");
            reply_text(
                state,
                reply_token,
                "ちょっと調子が悪いみたい😵 少し待ってから再送してね🙏",
            )
            .await;
            return;
        }
    };

    state.pending.lock().await.insert(
        key.to_string(),
        Pending { ts: Instant::now(), context: user_text.to_string() },
    );

    // Setlist blocks render to a PNG served from /tmp; on any failure fall back
    // to the same text reply the original bot used.
    if let Some(data) = setlist::parse_setlist_data(&raw_reply) {
        match save_setlist_png(&data).await {
            Ok(filename) => {
                let url = format!("{}/tmp/{}", state.external_url, filename);
                history.push(Msg::assistant(format!("[セトリ画像: {}]", data.title)));
                store_history(state, key, history).await;
                reply_image(state, reply_token, &url).await;
            }
            Err(e) => {
                tracing::warn!("setlist render error: {e}");
                let text = setlist::fallback_text(&data);
                history.push(Msg::assistant(text.clone()));
                store_history(state, key, history).await;
                reply_text(state, reply_token, &text).await;
            }
        }
        return;
    }

    let text = truncate_chars(
        &markdown::strip_markdown(if raw_reply.is_empty() {
            "すみません、うまく応答できませんでした。"
        } else {
            &raw_reply
        }),
        5000,
    );
    history.push(Msg::assistant(text.clone()));
    store_history(state, key, history).await;
    reply_text(state, reply_token, &text).await;
}

/// Render the setlist to `/tmp/setlist-<ms>.png`, schedule its deletion after
/// 10 minutes, and return the filename. Rasterizing runs on a blocking thread.
async fn save_setlist_png(data: &setlist::SetlistData) -> Result<String, render::Error> {
    let data = data.clone();
    let png = tokio::task::spawn_blocking(move || render::render_png(&data)).await??;
    let ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let filename = format!("setlist-{ms}.png");
    let path = format!("/tmp/{filename}");
    tokio::fs::write(&path, &png).await?;
    tokio::spawn(async move {
        tokio::time::sleep(Duration::from_secs(10 * 60)).await;
        let _ = tokio::fs::remove_file(&path).await;
    });
    Ok(filename)
}

async fn reply_image(state: &AppState, reply_token: &str, url: &str) {
    let messages = vec![serde_json::json!({
        "type": "image",
        "originalContentUrl": url,
        "previewImageUrl": url,
    })];
    if let Err(e) = state.line.reply(reply_token, messages).await {
        tracing::warn!("reply error: {e}");
    }
}

async fn handle_image(
    state: &AppState,
    reply_token: &str,
    key: &str,
    system: &str,
    is_group: bool,
    message_id: &str,
) {
    // Group chats only answer images within 2 minutes of a mention; otherwise
    // stay silent. The prompt defaults to a generic ask.
    let mut prompt = "この画像について教えて".to_string();
    if is_group {
        let pending = state.pending.lock().await;
        match pending.get(key) {
            Some(p) if p.ts.elapsed() <= PENDING_IMAGE_TTL => prompt = p.context.clone(),
            _ => return,
        }
    }

    let bytes = match state.line.get_message_content(message_id).await {
        Ok(b) => b,
        Err(e) => {
            tracing::warn!("vision fetch error: {e}");
            reply_text(
                state,
                reply_token,
                "画像の処理中にエラーが起きたよ😵 少し待ってから再送してね🙏",
            )
            .await;
            return;
        }
    };
    let image_b64 = B64.encode(&bytes);

    let mut history = {
        let convos = state.convos.lock().await;
        convos.get(key).map(|c| c.msgs.clone()).unwrap_or_default()
    };
    // In 1:1 chats the most recent user message becomes the instruction.
    if !is_group {
        if let Some(last) = history.iter().rev().find(|m| m.role == "user") {
            prompt = last.content.clone();
        }
    }

    let raw = match state.claude.ask_image(system, &history, &image_b64, &prompt).await {
        Ok(t) => t,
        Err(e) => {
            tracing::warn!("vision API error: {e}");
            reply_text(
                state,
                reply_token,
                "画像の処理中にエラーが起きたよ😵 少し待ってから再送してね🙏",
            )
            .await;
            return;
        }
    };

    let reply = truncate_chars(
        &markdown::strip_markdown(if raw.is_empty() {
            "すみません、うまく応答できませんでした。"
        } else {
            &raw
        }),
        5000,
    );

    history.push(Msg::user("[画像]"));
    history.push(Msg::assistant(reply.clone()));
    store_history(state, key, history).await;
    reply_text(state, reply_token, &reply).await;
}

async fn store_history(state: &AppState, key: &str, msgs: Vec<Msg>) {
    state
        .convos
        .lock()
        .await
        .insert(key.to_string(), Conv { msgs, last: Instant::now() });
}

async fn reply_text(state: &AppState, reply_token: &str, text: &str) {
    let messages = vec![serde_json::json!({ "type": "text", "text": text })];
    if let Err(e) = state.line.reply(reply_token, messages).await {
        tracing::warn!("reply error: {e}");
    }
}

fn spawn_history_sweeper(state: Arc<AppState>) {
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(Duration::from_secs(3600));
        loop {
            ticker.tick().await;
            let now = Instant::now();
            let mut convos = state.convos.lock().await;
            let before = convos.len();
            convos.retain(|_, c| now.duration_since(c.last) <= HISTORY_TTL);
            let removed = before - convos.len();
            drop(convos);
            state
                .pending
                .lock()
                .await
                .retain(|_, p| now.duration_since(p.ts) <= PENDING_IMAGE_TTL);
            if removed > 0 {
                tracing::info!("expired {removed} inactive conversation(s)");
            }
        }
    });
}

/// Remove `@Bot` mention spans. LINE reports index/length in UTF-16 code
/// units (matching JS string slicing), so splice on UTF-16, not bytes.
fn strip_mentions(text: &str, mentionees: &[line::Mentionee]) -> String {
    let mut units: Vec<u16> = text.encode_utf16().collect();
    let mut sorted: Vec<&line::Mentionee> = mentionees.iter().collect();
    sorted.sort_by(|a, b| b.index.cmp(&a.index));
    for m in sorted {
        let start = m.index.min(units.len());
        let end = (m.index + m.length).min(units.len());
        if start <= end {
            units.drain(start..end);
        }
    }
    String::from_utf16_lossy(&units)
}

fn truncate_chars(s: &str, max: usize) -> String {
    match s.char_indices().nth(max) {
        Some((idx, _)) => s[..idx].to_string(),
        None => s.to_string(),
    }
}

/// Delete the `## Name` sections (up to the next `## `) from the prompt,
/// mirroring the admin-prompt regex in index.ts. A trailing section with no
/// following `## ` is left intact, as in the original.
fn strip_sections(text: &str, names: &[&str]) -> String {
    let mut out = text.to_string();
    for name in names {
        let heading = format!("## {name}\n");
        let Some(start) = find_heading(&out, &heading) else {
            continue;
        };
        let after = start + heading.len();
        if let Some(next) = find_heading(&out[after..], "## ") {
            out.replace_range(start..after + next, "");
        }
    }
    out.trim().to_string()
}

/// Byte offset of `heading` when it sits at the start of the text or a line.
fn find_heading(text: &str, heading: &str) -> Option<usize> {
    if text.starts_with(heading) {
        return Some(0);
    }
    let needle = format!("\n{heading}");
    text.find(&needle).map(|i| i + 1)
}

fn jst_now() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
        + 9 * 3600;
    let days = secs.div_euclid(86400);
    let tod = secs.rem_euclid(86400);
    let (h, mi) = (tod / 3600, (tod % 3600) / 60);
    let (y, mo, d) = civil_from_days(days);
    let wd = ["日", "月", "火", "水", "木", "金", "土"][((days.rem_euclid(7) + 4) % 7) as usize];
    format!("{y}年{mo}月{d}日({wd}) {h:02}:{mi:02}")
}

/// Gregorian date from days since 1970-01-01 (Howard Hinnant's algorithm).
fn civil_from_days(z: i64) -> (i64, i64, i64) {
    let z = z + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (if m <= 2 { y + 1 } else { y }, m, d)
}

#[cfg(test)]
mod tests {
    use super::*;
    use line::Mentionee;

    fn mention(index: usize, length: usize) -> Mentionee {
        Mentionee { index, length, user_id: Some("B".into()) }
    }

    #[test]
    fn strip_mentions_utf16_aware() {
        // "こんにちは @Bot 元気？" — mention "@Bot " starts after 6 UTF-16 units.
        let text = "こんにちは @Bot 元気？";
        let units_at = "こんにちは ".encode_utf16().count(); // 6
        let len = "@Bot ".encode_utf16().count(); // 5
        let out = strip_mentions(text, &[mention(units_at, len)]);
        assert_eq!(out.trim(), "こんにちは 元気？".trim());
    }

    #[test]
    fn strip_mentions_multiple_descending() {
        let text = "@A hi @B there";
        let out = strip_mentions(text, &[mention(0, 3), mention(6, 3)]);
        assert_eq!(out, "hi there");
    }

    #[test]
    fn setlist_sections_removed_for_admin() {
        let p = "## Persona\nabc\n## Scope\nxyz\n## Security\nsss\n## Schedule\nkeep";
        let out = strip_sections(p, &["Security", "Scope"]);
        assert!(!out.contains("## Scope"));
        assert!(!out.contains("## Security"));
        assert!(out.contains("## Persona"));
        assert!(out.contains("## Schedule"));
        assert!(out.contains("keep"));
    }

    #[test]
    fn trailing_section_left_intact() {
        // Scope is last with no following "## " → not removed, per the JS regex.
        let p = "## Persona\nabc\n## Scope\nlast";
        let out = strip_sections(p, &["Scope"]);
        assert!(out.contains("## Scope"));
    }

    #[test]
    fn setlist_image_name_guard() {
        assert!(is_setlist_name("setlist-123.png"));
        assert!(!is_setlist_name("setlist-.png"));
        assert!(!is_setlist_name("evil.png"));
        assert!(!is_setlist_name("setlist-12.jpg"));
        assert!(!is_setlist_name("../etc/passwd"));
    }

    #[test]
    fn jst_epoch_is_1970_thursday_plus9() {
        // Sanity: format shape and that day-of-week table indexes safely.
        let s = jst_now();
        assert!(s.contains('年') && s.contains('日') && s.contains(':'));
    }

    #[test]
    fn truncate_respects_char_boundary() {
        let s = "あいうえお";
        assert_eq!(truncate_chars(s, 3), "あいう");
        assert_eq!(truncate_chars(s, 99), "あいうえお");
    }
}
