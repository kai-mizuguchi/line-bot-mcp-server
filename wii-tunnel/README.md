# wii-tunnel（Wii発 外向きWSトンネル）

Wii は CGN(WiMAX) 配下でインバウンド不可、かつ tailscale-rs は DERP リレーが
壊れている（remote peer に届かない）。そこで **Wii から Render の
butaningen-relay へ外向きに WebSocket を張り**、公開HTTP(LINE webhook / health /
セトリ画像GET)をそのトンネル越しに受けて localhost の bot(`127.0.0.1:10000`)へ
橋渡しする。返信は bot が直接 api.line.me へ（アウトバウンドは通る）。

```
LINE → Render(butaningen-relay 公開HTTPS)
        ⇄ [wii-tunnel が張る常時WSS] ⇄ Wii bot 127.0.0.1:10000
```

- 署名検証は生ボディ＋x-line-signature をそのまま透過して bot 側で実施。
- 接続断/Renderスリープは指数バックオフで自動再接続（30s毎ping）。

## ビルド
```
cd wii-tunnel
cross build --release --target powerpc-unknown-linux-gnu
```
成果物: `target/powerpc-unknown-linux-gnu/release/wii-tunnel`（ppc32 BE, ~3MB）

## Wii 配備
```
scp/転送 → /usr/local/bin/wii-tunnel (chmod 755)
install -m 644 deploy/wii-tunnel.service /etc/systemd/system/
# /etc/butaningen/wii-tunnel.env (0600) を wii-tunnel.env.example から作成し
#   RELAY_WS_URL / TUNNEL_SECRET を記入
systemctl daemon-reload && systemctl enable --now wii-tunnel
journalctl -u wii-tunnel -f    # "tunnel connected to relay" が出れば成功
```

## Render 側（butaningen-relay）
`relay/` を Docker で起動し、環境変数 `TUNNEL_SECRET` を Wii と同じ値にする。
（旧 `TS_AUTHKEY` は不要。詳細は relay/README.md）

## 注意
- `TUNNEL_SECRET` は Render と Wii で一致必須。/_tunnel はこの秘密でガード。
- `BOT_EXTERNAL_URL`（Wii の butaningen.env）は Render 公開URLにする
  （セトリ画像URLがトンネル経由で配信されるため）。
