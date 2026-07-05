# butaningen 配備手順（Wii / ArchPOWER）

Node.js 版（Render 稼働）を置き換える、Rust 単一バイナリ `butaningen` の
Wii 配備手順。公開経路は **ルータ 443 ポート転送 + DuckDNS + Let's Encrypt**。

TLS は既定で **nginx + acme.sh** が終端し、bot 本体は素の HTTP のまま
`127.0.0.1:10000` で動く。ppc32 BE で ring（TLSサーバ実装）が確実に動く
とは限らないための安全側の構成。バイナリ内蔵 ACME 案は末尾の「オプション」参照。

## 0. 前提

- Wii が tailnet 常駐し、SSH 可能（`root@192.168.0.50`）。
- グローバル IPv4 がルータ WAN 側に付与されている（CGN でない）ことを確認済み。
- ルータで **WAN:443 → 192.168.0.50:443** を転送する（ユーザー作業）。

## 1. バイナリのビルドと配置

`system-prompt.md` と `assets/ipag.ttf` は crate 内へ取り込み済みで、
バイナリに `include_str!/include_bytes!` で同梱される（配備物 1 ファイル）。
ペルソナ（system-prompt）を変えたら `wii/system-prompt.md` を編集して
再ビルドが必要。

Mac 側でクロスビルド:

```bash
cd wii
cross build --release --target powerpc-unknown-linux-gnu
scp target/powerpc-unknown-linux-gnu/release/butaningen root@192.168.0.50:/usr/local/bin/
```

実証済み: ring/rustls/reqwest を含め ppc32 BE でビルド可能
（成果物は ELF 32-bit MSB PowerPC）。

## 2. 実行ユーザーと環境ファイル

```bash
ssh root@192.168.0.50
useradd --system --no-create-home --shell /usr/sbin/nologin butaningen || true
install -d -m 700 /etc/butaningen
# env をコピーして実値を記入（絶対にリポジトリへ戻さない）
install -m 600 /dev/null /etc/butaningen/butaningen.env
install -m 600 /dev/null /etc/butaningen/duckdns.env
```

`butaningen.env.example` / `duckdns.env.example` を参考に、上記 2 ファイルへ
実値を記入（0600、コミット禁止）。

## 3. DuckDNS（DDNS）

```bash
install -m 755 duckdns-update.sh /usr/local/bin/duckdns-update.sh
install -m 644 duckdns.service /etc/systemd/system/
install -m 644 duckdns.timer   /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now duckdns.timer
systemctl start duckdns.service   # 初回更新
```

## 4. TLS 証明書（acme.sh + DuckDNS DNS-01）

80 番を開けずに済む DNS-01 を推奨。

```bash
pacman -S --needed nginx curl socat
curl https://get.acme.sh | sh -s email=you@example.com
export DuckDNS_Token=<DuckDNSトークン>
~/.acme.sh/acme.sh --issue --dns dns_duckdns -d your-name.duckdns.org
install -d -m 755 /etc/nginx/certs
~/.acme.sh/acme.sh --install-cert -d your-name.duckdns.org \
  --key-file       /etc/nginx/certs/butaningen.key \
  --fullchain-file /etc/nginx/certs/butaningen.crt \
  --reloadcmd      "systemctl reload nginx"
```

acme.sh は自前 cron で 60 日ごとに自動更新する。

## 5. nginx

`nginx-butaningen.conf` の `server_name` を自分の DuckDNS 名に変えてから配置し、
`http {}` から include（Arch は `/etc/nginx/nginx.conf` の http ブロックに
`include /etc/nginx/conf.d/*.conf;` を追加し、conf.d に置くのが楽）。

```bash
install -m 644 nginx-butaningen.conf /etc/nginx/conf.d/butaningen.conf
nginx -t && systemctl enable --now nginx
```

## 6. bot 本体

```bash
install -m 644 butaningen.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now butaningen.service
journalctl -u butaningen -f
```

## 7. 疎通と切替（ユーザー作業）

1. モバイル回線など外部から `https://your-name.duckdns.org/health` が
   `LINE Bot MCP Server is running` を返すこと。
2. LINE Developers コンソールで webhook URL を
   `https://your-name.duckdns.org/webhook` に切替、Verify。
3. 実グループでテキスト/セトリ画像/画像認識/`/myid`/`/reset`/join を確認。
4. 数日並走後、Render サービスを suspend。
   ロールバックは webhook URL を Render に戻すだけ。

## トラブルシュート

- `getBotInfo failed` ログ → `CHANNEL_ACCESS_TOKEN` 誤り。メンション判定が
  効かず全メッセージ無応答になる（bot_user_id が空のため）。
- 署名 403 → `CHANNEL_SECRET` 誤り。
- 画像 URL が LINE から取得できない → `BOT_EXTERNAL_URL` が https 公開名に
  なっているか、nginx が /tmp/ を bot へ proxy しているか確認。

## オプション: バイナリ内蔵 ACME（nginx 不要化）

ppc32 で ring/rustls サーバ TLS が問題なく動くことが P5 で確認できたら、
`rustls-acme`（TLS-ALPN-01）で bot が直接 443 を listen する構成に寄せられる。
その場合:

- systemd unit に `AmbientCapabilities=CAP_NET_BIND_SERVICE` を追加し、
  bot を 443 で bind。
- nginx / acme.sh は不要。DuckDNS timer はそのまま。

現状は build リスク回避のため未実装（フェイルセーフ優先、CLAUDE.md §5）。
