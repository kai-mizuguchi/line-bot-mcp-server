// wii-tunnel: outbound WebSocket tunnel client for the Wii.
//
// The Wii is behind CGN and cannot accept inbound connections, so this dials
// OUT to the butaningen-relay on Render and keeps a WebSocket open. The relay
// frames each public HTTP request and sends it here; we forward it to the local
// bot (127.0.0.1:10000) and send the response back. Reconnects with backoff so
// a dropped link (or a sleeping relay) self-heals.
//
// Env:
//   RELAY_WS_URL   wss://<render>.onrender.com/_tunnel   (required)
//   TUNNEL_SECRET  shared secret matching the relay      (required)
//   LOCAL_TARGET   http://127.0.0.1:10000                (default)

use std::collections::HashMap;
use std::time::Duration;

use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::Message;

#[derive(Serialize, Deserialize, Default)]
struct Frame {
    #[serde(rename = "type")]
    typ: String,
    id: u64,
    #[serde(default)]
    method: String,
    #[serde(default)]
    path: String,
    #[serde(default)]
    status: u16,
    #[serde(default)]
    headers: HashMap<String, Vec<String>>,
    #[serde(default)]
    body: String,
}

// Hop-by-hop / auto-managed headers we must not forward verbatim.
fn skip_header(name: &str) -> bool {
    matches!(
        name.to_ascii_lowercase().as_str(),
        "host" | "content-length" | "connection" | "transfer-encoding" | "keep-alive"
    )
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().with_target(false).init();

    let url = env("RELAY_WS_URL", "");
    let secret = env("TUNNEL_SECRET", "");
    let target = env("LOCAL_TARGET", "http://127.0.0.1:10000");
    if url.is_empty() || secret.is_empty() {
        tracing::error!("RELAY_WS_URL and TUNNEL_SECRET are required");
        std::process::exit(1);
    }

    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(55))
        .build()
        .expect("http client");

    // backoff only grows while we can't even connect; once a connection is
    // established it resets, so a drop after a healthy link reconnects fast.
    let mut backoff = 1u64;
    loop {
        match connect(&url, &secret).await {
            Err(e) => {
                tracing::warn!("connect error: {e}; retry in {backoff}s");
                tokio::time::sleep(Duration::from_secs(backoff)).await;
                backoff = (backoff * 2).min(30);
                continue;
            }
            Ok(ws) => {
                tracing::info!("tunnel connected to relay");
                backoff = 1;
                match serve(ws, &target, &http).await {
                    Ok(_) => tracing::warn!("tunnel closed; reconnecting"),
                    Err(e) => tracing::warn!("tunnel error: {e}; reconnecting"),
                }
                tokio::time::sleep(Duration::from_secs(1)).await;
            }
        }
    }
}

fn env(k: &str, def: &str) -> String {
    match std::env::var(k) {
        Ok(v) if !v.is_empty() => v,
        _ => def.to_string(),
    }
}

type Err = Box<dyn std::error::Error + Send + Sync>;
type Ws = tokio_tungstenite::WebSocketStream<
    tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
>;

async fn connect(url: &str, secret: &str) -> Result<Ws, Err> {
    let mut req = url.into_client_request()?;
    req.headers_mut().insert("X-Tunnel-Secret", secret.parse()?);
    let (ws, _) = connect_async(req).await?;
    Ok(ws)
}

async fn serve(ws: Ws, target: &str, http: &reqwest::Client) -> Result<(), Err> {
    let (mut sink, mut stream) = ws.split();

    // Single writer fed by an mpsc so request handlers and the heartbeat can
    // all send without racing on the sink.
    let (tx, mut rx) = mpsc::channel::<Message>(64);
    let writer = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sink.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Heartbeat keeps the relay (and Render's free tier) from idling us out.
    let hb = tx.clone();
    let heartbeat = tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(30)).await;
            if hb.send(Message::Ping(Vec::new())).await.is_err() {
                break;
            }
        }
    });

    let result = read_loop(&mut stream, &tx, target, http).await;

    heartbeat.abort();
    drop(tx);
    let _ = writer.await;
    result
}

async fn read_loop<S>(
    stream: &mut S,
    tx: &mpsc::Sender<Message>,
    target: &str,
    http: &reqwest::Client,
) -> Result<(), Err>
where
    S: StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>> + Unpin,
{
    while let Some(msg) = stream.next().await {
        match msg? {
            Message::Text(t) => {
                if let Ok(frame) = serde_json::from_str::<Frame>(&t) {
                    if frame.typ == "req" {
                        let tx = tx.clone();
                        let http = http.clone();
                        let target = target.to_string();
                        tokio::spawn(async move {
                            let resp = handle_request(frame, &target, &http).await;
                            if let Ok(json) = serde_json::to_string(&resp) {
                                let _ = tx.send(Message::Text(json)).await;
                            }
                        });
                    }
                }
            }
            Message::Ping(p) => {
                let _ = tx.send(Message::Pong(p)).await;
            }
            Message::Close(_) => return Ok(()),
            _ => {}
        }
    }
    Ok(())
}

async fn handle_request(req: Frame, target: &str, http: &reqwest::Client) -> Frame {
    match forward(&req, target, http).await {
        Ok(f) => f,
        Err(e) => {
            tracing::warn!("forward error: {e}");
            Frame {
                typ: "resp".into(),
                id: req.id,
                status: 502,
                body: B64.encode(format!("tunnel forward error: {e}")),
                ..Default::default()
            }
        }
    }
}

async fn forward(req: &Frame, target: &str, http: &reqwest::Client) -> Result<Frame, Err> {
    let method = reqwest::Method::from_bytes(req.method.as_bytes())?;
    let url = format!("{target}{}", req.path);
    let body = B64.decode(req.body.as_bytes()).unwrap_or_default();

    let mut rb = http.request(method, &url).body(body);
    for (name, values) in &req.headers {
        if skip_header(name) {
            continue;
        }
        for v in values {
            rb = rb.header(name, v);
        }
    }
    let resp = rb.send().await?;

    let status = resp.status().as_u16();
    let mut headers: HashMap<String, Vec<String>> = HashMap::new();
    for (name, value) in resp.headers() {
        if skip_header(name.as_str()) {
            continue;
        }
        if let Ok(v) = value.to_str() {
            headers.entry(name.to_string()).or_default().push(v.to_string());
        }
    }
    let bytes = resp.bytes().await?;

    Ok(Frame {
        typ: "resp".into(),
        id: req.id,
        status,
        headers,
        body: B64.encode(&bytes),
        ..Default::default()
    })
}
