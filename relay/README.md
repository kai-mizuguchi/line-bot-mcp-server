# butaningen-relay（CGN対策の公開中継）

Wii は WiMAX(L13) の **CGN 配下**でインバウンド不可のため、公開HTTPSを直接
持てない。この中継を Render（公開HTTPS）に置き、**tsnet で tailnet に参加**して
Wii の bot(`100.121.243.30:10000`) へ全リクエストをリバースプロキシする。

```
LINE → Render(butaningen-relay / 公開HTTPS)
        → tailnet(tsnet) → Wii 100.121.243.30:10000 (butaningen)
Wii → 返信は直接 api.line.me へ（アウトバウンドは通る）
LINE → 画像URL(Render) → relay → Wii /tmp/*.png
```

中継は**素通し**なので秘密情報（CHANNEL_SECRET等）は持たない。署名検証は生ボディ
のまま Wii 側で行われる。

## 1. Tailscale 認証キー発行
Tailscale 管理画面 → Settings → Keys → **Generate auth key**
- Reusable: ON（再デプロイで使い回す）
- 有効期限: 任意（切れたら再発行）
- 生成された `tskey-auth-...` を控える

## 2. Render を Docker 中継に切替
既存の line-bot-mcp-server サービス（Node bot）を、この中継に置き換える。
- Render → 対象サービス → Settings
  - **Runtime/Environment: Docker**
  - **Root Directory: `relay`**（Dockerfile がここにある）
  - Branch: `wii-port`（マージ後は main）
- Environment（環境変数）:
  - `TS_AUTHKEY` = 手順1のキー
  - `WII_TARGET` = `http://100.121.243.30:10000`（既定値と同じなので省略可）
  - 旧 bot 用の `CHANNEL_ACCESS_TOKEN` 等は**削除してよい**（中継は使わない）
- Deploy。ログに `joined tailnet, proxying -> ...` と `listening on :PORT` が出れば成功。

## 3. 疎通確認
- 外部から `https://<render名>.onrender.com/health` → `LINE Bot MCP Server is running`
  （= Render→tailnet→Wii が通っている）

## 4. Wii 側の公開URLを Render に向ける
セトリ画像URLの生成に使う `BOT_EXTERNAL_URL` を Render の公開URLへ変更:
```
# /etc/butaningen/butaningen.env
BOT_EXTERNAL_URL=https://<render名>.onrender.com
```
→ `systemctl restart butaningen`

## 5. LINE Webhook 切替
LINE Developers → Messaging API → Webhook URL:
```
https://<render名>.onrender.com/webhook
```
Verify → Use webhook ON → 実グループで E2E。

## 注意・既知の弱点
- **Wii の tailscale-rs はプロトタイプ**。制御プレーン上で稀に offline になる
  （`systemctl restart wii-tailscale` で復帰）。長期安定運用には Wii 側に
  tailnet 到達性のウォッチドッグ（不通なら wii-tailscale 再起動）を足すのが望ましい。
- Render 無料枠はアイドルでスリープする。LINE webhook は着信で起こせるが初回に
  数秒の遅延が出る。self-ping かポート常駐で回避可（旧構成にもあった）。
- 不要になった Wii の nginx / DuckDNS / acme は停止してよい（この構成では未使用）。
