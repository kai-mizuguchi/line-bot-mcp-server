use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine as _;
use hmac::{Hmac, Mac};
use serde::Deserialize;
use sha2::Sha256;

pub type Error = Box<dyn std::error::Error + Send + Sync>;

const API_BASE: &str = "https://api.line.me";
const BLOB_BASE: &str = "https://api-data.line.me";

// Constant-time via Mac::verify_slice.
pub fn verify_signature(channel_secret: &str, body: &[u8], signature_b64: &str) -> bool {
    let Ok(sig) = B64.decode(signature_b64) else {
        return false;
    };
    let Ok(mut mac) = Hmac::<Sha256>::new_from_slice(channel_secret.as_bytes()) else {
        return false;
    };
    mac.update(body);
    mac.verify_slice(&sig).is_ok()
}

pub struct BotInfo {
    pub user_id: String,
    pub display_name: String,
}

pub struct LineClient {
    http: reqwest::Client,
    token: String,
}

impl LineClient {
    pub fn new(token: String) -> Self {
        Self { http: reqwest::Client::new(), token }
    }

    pub async fn reply(
        &self,
        reply_token: &str,
        messages: Vec<serde_json::Value>,
    ) -> Result<(), Error> {
        let res = self
            .http
            .post(format!("{API_BASE}/v2/bot/message/reply"))
            .bearer_auth(&self.token)
            .json(&serde_json::json!({ "replyToken": reply_token, "messages": messages }))
            .send()
            .await?;
        let status = res.status();
        if !status.is_success() {
            let body = res.text().await.unwrap_or_default();
            return Err(format!("LINE reply failed: {status} {body}").into());
        }
        Ok(())
    }

    /// Download image (or other) message content from the blob host.
    pub async fn get_message_content(&self, message_id: &str) -> Result<Vec<u8>, Error> {
        let res = self
            .http
            .get(format!("{BLOB_BASE}/v2/bot/message/{message_id}/content"))
            .bearer_auth(&self.token)
            .send()
            .await?;
        let status = res.status();
        if !status.is_success() {
            let body = res.text().await.unwrap_or_default();
            return Err(format!("LINE getMessageContent failed: {status} {body}").into());
        }
        Ok(res.bytes().await?.to_vec())
    }

    pub async fn get_bot_info(&self) -> Result<BotInfo, Error> {
        let res = self
            .http
            .get(format!("{API_BASE}/v2/bot/info"))
            .bearer_auth(&self.token)
            .send()
            .await?;
        let status = res.status();
        if !status.is_success() {
            let body = res.text().await.unwrap_or_default();
            return Err(format!("LINE getBotInfo failed: {status} {body}").into());
        }
        let v: serde_json::Value = res.json().await?;
        Ok(BotInfo {
            user_id: v["userId"].as_str().unwrap_or_default().to_string(),
            display_name: v["displayName"].as_str().unwrap_or_default().to_string(),
        })
    }
}

// ---- Webhook payload (loosely typed) ----

#[derive(Deserialize, Default)]
pub struct WebhookPayload {
    #[serde(default)]
    pub events: Vec<Event>,
}

#[derive(Deserialize, Default)]
pub struct Event {
    #[serde(rename = "type", default)]
    pub event_type: String,
    #[serde(rename = "replyToken")]
    pub reply_token: Option<String>,
    pub source: Option<Source>,
    pub message: Option<EventMessage>,
}

#[derive(Deserialize, Default, Clone)]
pub struct Source {
    #[serde(rename = "type", default)]
    pub source_type: String,
    #[serde(rename = "userId")]
    pub user_id: Option<String>,
    #[serde(rename = "groupId")]
    pub group_id: Option<String>,
    #[serde(rename = "roomId")]
    pub room_id: Option<String>,
}

#[derive(Deserialize, Default)]
pub struct EventMessage {
    #[serde(default)]
    pub id: String,
    #[serde(rename = "type", default)]
    pub message_type: String,
    pub text: Option<String>,
    pub mention: Option<Mention>,
}

#[derive(Deserialize, Default)]
pub struct Mention {
    #[serde(default)]
    pub mentionees: Vec<Mentionee>,
}

#[derive(Deserialize, Default, Clone)]
pub struct Mentionee {
    #[serde(default)]
    pub index: usize,
    #[serde(default)]
    pub length: usize,
    #[serde(rename = "userId")]
    pub user_id: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::verify_signature;

    // Vector generated with:
    //   printf '%s' '{"events":[]}' | openssl dgst -sha256 -hmac "test_channel_secret" -binary | base64
    const SECRET: &str = "test_channel_secret";
    const BODY: &[u8] = b"{\"events\":[]}";
    const SIG: &str = "mDDIqkhmFK977Aoz/X61Z+SomnHnv9VmI2xzNyoGoXc=";

    #[test]
    fn valid_signature() {
        assert!(verify_signature(SECRET, BODY, SIG));
    }

    #[test]
    fn wrong_signature() {
        assert!(!verify_signature(SECRET, BODY, "AAAAqkhmFK977Aoz/X61Z+SomnHnv9VmI2xzNyoGoXc="));
    }

    #[test]
    fn wrong_secret_or_body() {
        assert!(!verify_signature("other_secret", BODY, SIG));
        assert!(!verify_signature(SECRET, b"{\"events\":[1]}", SIG));
    }

    #[test]
    fn invalid_base64() {
        assert!(!verify_signature(SECRET, BODY, "not-base64!!"));
    }
}
