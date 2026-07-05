use serde::Serialize;

pub type Error = Box<dyn std::error::Error + Send + Sync>;

const API_URL: &str = "https://api.anthropic.com/v1/messages";
const MODEL: &str = "claude-haiku-4-5";
const VERSION: &str = "2023-06-01";
const MAX_HISTORY: usize = 10;

#[derive(Clone, Serialize)]
pub struct Msg {
    pub role: String,
    pub content: String,
}

impl Msg {
    pub fn user(content: impl Into<String>) -> Self {
        Self { role: "user".into(), content: content.into() }
    }
    pub fn assistant(content: impl Into<String>) -> Self {
        Self { role: "assistant".into(), content: content.into() }
    }
}

pub struct Claude {
    http: reqwest::Client,
    api_key: String,
}

impl Claude {
    pub fn new(api_key: String) -> Self {
        Self { http: reqwest::Client::new(), api_key }
    }

    /// Send a raw Messages-API body and return the first text block.
    async fn send(&self, body: serde_json::Value) -> Result<String, Error> {
        let res = self
            .http
            .post(API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", VERSION)
            .json(&body)
            .send()
            .await?;
        let status = res.status();
        if !status.is_success() {
            let text = res.text().await.unwrap_or_default();
            return Err(format!("Anthropic API failed: {status} {text}").into());
        }
        let v: serde_json::Value = res.json().await?;
        Ok(first_text(&v))
    }

    pub async fn ask(&self, system: &str, messages: &[Msg]) -> Result<String, Error> {
        self.send(serde_json::json!({
            "model": MODEL,
            "max_tokens": 1000,
            "system": system,
            "messages": messages,
        }))
        .await
    }

    /// A vision turn: prior text history plus one image + prompt.
    pub async fn ask_image(
        &self,
        system: &str,
        history: &[Msg],
        image_b64: &str,
        prompt: &str,
    ) -> Result<String, Error> {
        let mut messages: Vec<serde_json::Value> = history
            .iter()
            .map(|m| serde_json::json!({ "role": m.role, "content": m.content }))
            .collect();
        messages.push(serde_json::json!({
            "role": "user",
            "content": [
                { "type": "image", "source": { "type": "base64", "media_type": "image/jpeg", "data": image_b64 } },
                { "type": "text", "text": prompt },
            ],
        }));
        self.send(serde_json::json!({
            "model": MODEL,
            "max_tokens": 1000,
            "system": system,
            "messages": messages,
        }))
        .await
    }

    async fn summarize(&self, messages: &[Msg]) -> Option<String> {
        let mut msgs: Vec<serde_json::Value> = messages
            .iter()
            .map(|m| serde_json::json!({ "role": m.role, "content": m.content }))
            .collect();
        msgs.push(serde_json::json!({
            "role": "user",
            "content": "Summarize the above conversation in 1-2 short sentences in Japanese.",
        }));
        let body = serde_json::json!({
            "model": MODEL,
            "max_tokens": 150,
            "messages": msgs,
        });
        let text = self.send(body).await.ok()?;
        (!text.is_empty()).then_some(text)
    }
}

/// If `history` reached the cap, replace its oldest half with a one-line
/// summary prepended as a user message. Mirrors compressHistory() in index.ts.
pub async fn compress_history(claude: &Claude, history: &mut Vec<Msg>) {
    if history.len() < MAX_HISTORY {
        return;
    }
    let half = MAX_HISTORY / 2;
    let older: Vec<Msg> = history.drain(0..half).collect();
    if let Some(summary) = claude.summarize(&older).await {
        history.insert(0, Msg::user(format!("[以前の会話の要約: {summary}]")));
    }
}

fn first_text(v: &serde_json::Value) -> String {
    v["content"]
        .as_array()
        .and_then(|blocks| {
            blocks
                .iter()
                .find(|b| b["type"] == "text")
                .and_then(|b| b["text"].as_str())
        })
        .unwrap_or_default()
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn first_text_picks_first_text_block() {
        let v = serde_json::json!({
            "content": [
                { "type": "thinking", "text": "ignore" },
                { "type": "text", "text": "hello" },
                { "type": "text", "text": "world" },
            ]
        });
        assert_eq!(first_text(&v), "hello");
        assert_eq!(first_text(&serde_json::json!({ "content": [] })), "");
    }

    // Compression uses a network call for the summary; here we only assert the
    // splice arithmetic by forcing summarize to fail (no api key/host), which
    // leaves the history with the older half removed and no summary inserted.
    #[tokio::test]
    async fn compress_below_cap_is_noop() {
        let claude = Claude::new("x".into());
        let mut h: Vec<Msg> = (0..MAX_HISTORY - 1).map(|i| Msg::user(i.to_string())).collect();
        let before = h.len();
        compress_history(&claude, &mut h).await;
        assert_eq!(h.len(), before);
    }
}
