# butaningen-relay（CGN対策の公開中継 / WSリバーストンネル）

Wii は WiMAX(L13) の **CGN 配下**でインバウンド不可。さらに Wii の tailscale-rs は
**DERP リレーが壊れている**ため、データセンター(Render)からは tailnet 経由でも
届かない。そこで **Wii 側から Render へ外向きに WebSocket を張り**（`wii-tunnel`）、
この中継が公開HTTPをそのトンネル越しに Wii の bot へ渡す。

```
LINE → Render(butaningen-relay / 公開HTTPS)
        ⇄ [Wiiが張る常時WSS /_tunnel] ⇄ Wii bot 127.0.0.1:10000
Wii → 返信は直接 api.line.me へ / 画像GETも同じトンネルでWiiが応答
```

中継は**素通し**で秘密情報（CHANNEL_SECRET等）を持たない。署名検証は生ボディ
のまま Wii 側で行う。`/_tunnel` は `TUNNEL_SECRET` でガード。

## Render 設定（新規 Web Service）
- New + → Web Service → repo `kai-mizuguchi/line-bot-mcp-server`
- **Branch: `wii-port`** / **Root Directory: `relay`** / Runtime: **Docker** / Free
- Environment:
  - `TUNNEL_SECRET` = Wii 側 `/etc/butaningen/wii-tunnel.env` と**同じ値**
- Deploy → ログに `listening on :PORT`。Wii の wii-tunnel が繋がると `tunnel connected`。

## 疎通確認
- Wii 側で butaningen と wii-tunnel が稼働している状態で、
  `https://<render名>.onrender.com/health` → `LINE Bot MCP Server is running`

## Wii 側の公開URL
`BOT_EXTERNAL_URL`（`/etc/butaningen/butaningen.env`）を Render 公開URLへ:
```
BOT_EXTERNAL_URL=https://<render名>.onrender.com
```
→ `systemctl restart butaningen`

## LINE Webhook
`https://<render名>.onrender.com/webhook` → Verify → Use webhook ON。

## 注意
- Render 無料枠はアイドルでスリープするが、wii-tunnel が常時WS＋30s毎pingで
  繋ぎ続けるため実質起き続ける。落ちても wii-tunnel が自動再接続。
- 旧 tsnet/TS_AUTHKEY・DuckDNS/nginx/acme(Wii)はこの構成では不要。
