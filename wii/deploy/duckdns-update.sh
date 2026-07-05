#!/bin/sh
# DuckDNS の A レコードを現在のWAN IPへ更新する。ip= を空にすると DuckDNS が
# リクエスト送信元のグローバルIPを採用する。
set -eu
: "${DUCKDNS_DOMAIN:?DUCKDNS_DOMAIN is required}"
: "${DUCKDNS_TOKEN:?DUCKDNS_TOKEN is required}"

resp=$(curl -fsS "https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip=")
if [ "$resp" != "OK" ]; then
    echo "duckdns update failed: ${resp}" >&2
    exit 1
fi
