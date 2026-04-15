#!/bin/sh
# Diagnostic entrypoint — output goes to stdout so Render captures it
printf '=== ENTRYPOINT RUNNING ===\n'
printf 'PORT=%s\n' "${PORT:-NOT_SET}"
printf 'NODE_ENV=%s\n' "${NODE_ENV:-NOT_SET}"
printf 'CHANNEL_ACCESS_TOKEN=%s\n' "${CHANNEL_ACCESS_TOKEN:+SET}"
printf 'node version: '
node --version
printf 'dist/index.js exists: '
ls /app/dist/index.js 2>&1
exec node /app/dist/index.js
