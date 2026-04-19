#!/usr/bin/env node

/**
 * Copyright 2025 LY Corporation
 *
 * LINE Corporation licenses this file to you under the Apache License,
 * version 2.0 (the "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at:
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { createHmac } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync, existsSync } from "node:fs";

// Write to BOTH stdout and stderr so logs survive regardless of
// how Render captures output. Never use process.exit() — use
// process.exitCode so the event loop can drain and flush buffers.
function log(msg: string): void {
  const line = `${msg}\n`;
  process.stdout.write(line);
  process.stderr.write(line);
}

log(`[boot] Node.js ${process.version} PORT=${process.env.PORT ?? "(not set)"} NODE_ENV=${process.env.NODE_ENV ?? "(not set)"}`);

process.on("uncaughtException", (err: Error) => {
  log(`[fatal] uncaughtException: ${err.message}\n${err.stack}`);
  process.exitCode = 1;
});
process.on("unhandledRejection", (reason: unknown) => {
  log(`[fatal] unhandledRejection: ${reason}`);
  process.exitCode = 1;
});

// ---------------------------------------------------------------------------
// Lazy application loader
// ---------------------------------------------------------------------------

type App = Awaited<ReturnType<typeof loadApp>>;
let appPromise: Promise<App> | null = null;
function getApp(): Promise<App> {
  if (!appPromise) appPromise = loadApp();
  return appPromise;
}

async function loadApp() {
  log("[boot] Loading npm modules...");

  const [
    { McpServer },
    { SSEServerTransport },
    { StdioServerTransport },
    line,
    { LINE_BOT_MCP_SERVER_VERSION, USER_AGENT },
    { default: CancelRichMenuDefault },
    { default: PushTextMessage },
    { default: PushFlexMessage },
    { default: BroadcastTextMessage },
    { default: BroadcastFlexMessage },
    { default: GetProfile },
    { default: GetMessageQuota },
    { default: GetRichMenuList },
    { default: DeleteRichMenu },
    { default: SetRichMenuDefault },
    { default: CreateRichMenu },
    { default: GetFollowerIds },
    { default: Anthropic },
  ] = await Promise.all([
    import("@modelcontextprotocol/sdk/server/mcp.js"),
    import("@modelcontextprotocol/sdk/server/sse.js"),
    import("@modelcontextprotocol/sdk/server/stdio.js"),
    import("@line/bot-sdk"),
    import("./version.js"),
    import("./tools/cancelRichMenuDefault.js"),
    import("./tools/pushTextMessage.js"),
    import("./tools/pushFlexMessage.js"),
    import("./tools/broadcastTextMessage.js"),
    import("./tools/broadcastFlexMessage.js"),
    import("./tools/getProfile.js"),
    import("./tools/getMessageQuota.js"),
    import("./tools/getRichMenuList.js"),
    import("./tools/deleteRichMenu.js"),
    import("./tools/setRichMenuDefault.js"),
    import("./tools/createRichMenu.js"),
    import("./tools/getFollowerIds.js"),
    import("@anthropic-ai/sdk"),
  ]);

  log("[boot] npm modules loaded OK");

  const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN || "";
  const channelSecret = process.env.CHANNEL_SECRET || "";
  const destinationId = process.env.DESTINATION_USER_ID || "";
  const messagingApiBaseUrl = process.env.LINE_MESSAGING_API_BASE_URL;
  const adminUserId = process.env.ADMIN_USER || "";

  const anthropic = new Anthropic();

  // system-prompt.md をサーバー起動時に読み込む
  let systemPrompt = "";
  try {
    systemPrompt = readFileSync("system-prompt.md", "utf-8");
    log("[boot] system-prompt.md loaded OK");
  } catch {
    log("[boot] WARNING: system-prompt.md not found — no system prompt");
  }

  // 管理者向け：## Security と ## Scope を除去（話題制限・ロールハック対策なし）
  const systemPromptAdmin = systemPrompt
    .replace(/^## (Security|Scope)\n[\s\S]*?(?=^## )/gm, "")
    .trim();

  // Claude の返答から Markdown 記法を除去して LINE 向けプレーンテキストに変換
  function stripMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, "$1")           // **bold** → bold
      .replace(/\*(.*?)\*/g, "$1")               // *italic* → italic
      .replace(/^#{1,6}\s+/gm, "")              // ## heading → plain
      .replace(/^[\-\*\+]\s+/gm, "・")          // - list → ・
      .replace(/`{1,3}[^`\n]*`{1,3}/g, "")      // `code` → 削除
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // [text](url) → text
      .replace(/\n{3,}/g, "\n\n")               // 連続空行を2行に
      .trim();
  }

  // SETLIST_IMAGE ブロックをパース（テキスト中のどこにあっても検出）
  function parseSetlistData(text: string): { theme: string; title: string; date: string; songs: string[] } | null {
    const start = text.indexOf("SETLIST_IMAGE");
    if (start === -1) return null;
    const end = text.indexOf("END_SETLIST", start);
    if (end === -1) return null;
    const block = text.slice(start, end + "END_SETLIST".length);
    const lines = block.split("\n").map((l) => l.trim());
    let theme = "dark", title = "セットリスト", date = "";
    const songs: string[] = [];
    for (const line of lines) {
      if (!line || line === "SETLIST_IMAGE" || line === "END_SETLIST") continue;
      if (line.startsWith("theme:")) theme = line.slice(6).trim() || theme;
      else if (line.startsWith("title:")) title = line.slice(6).trim() || title;
      else if (line.startsWith("date:")) date = line.slice(5).trim();
      else if (/^\d+\.\s/.test(line)) songs.push(line.replace(/^\d+\.\s+/, ""));
    }
    return songs.length > 0 ? { theme, title, date, songs } : null;
  }

  type SetlistTheme = { bg: [string, string]; title: string; date: string; num: string; song: string; accent: string; divider: string };
  const THEMES: Record<string, SetlistTheme> = {
    dark:    { bg: ["#1a1a2e", "#16213e"], title: "#ff6b6b", date: "#888888", num: "#ff6b6b", song: "#eeeeee", accent: "#ff6b6b", divider: "#2a2a5a" },
    light:   { bg: ["#f4f4f4", "#ffffff"], title: "#333333", date: "#888888", num: "#e05555", song: "#333333", accent: "#e05555", divider: "#dddddd" },
    neon:    { bg: ["#000000", "#0d0d0d"], title: "#ff2df7", date: "#888888", num: "#ff2df7", song: "#00f0c0", accent: "#ff2df7", divider: "#222222" },
    vintage: { bg: ["#f5e6c8", "#edd9a3"], title: "#7a3b1e", date: "#9a7040", num: "#7a3b1e", song: "#3e2612", accent: "#7a3b1e", divider: "#c4a06a" },
  };

  // @napi-rs/canvas でセトリ画像を生成して /tmp に保存（Chrome不要）
  async function generateSetlistImage(theme: string, title: string, date: string, songs: string[]): Promise<string> {
    const { createCanvas, GlobalFonts } = await import("@napi-rs/canvas");
    const t = THEMES[theme] ?? THEMES["dark"];

    // 日本語フォントを探して登録（見つからなければシステムデフォルトで続行）
    const jpFontPaths = [
      process.env.FONT_PATH,
      "assets/ipag.ttf",                                                    // バンドル済み IPA Gothic
      "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
      "/usr/share/fonts/opentype/noto/NotoSansCJKjp-Regular.otf",
      "/usr/share/fonts/truetype/noto/NotoSansCJKjp-Regular.otf",
      "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
      "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf",
    ].filter(Boolean) as string[];
    let fontFamily = "sans-serif";
    for (const p of jpFontPaths) {
      if (existsSync(p)) {
        try {
          GlobalFonts.registerFromPath(p, "JpFont");
          fontFamily = "JpFont";
          log(`[setlist] font: ${p}`);
        } catch { /* ignore */ }
        break;
      }
    }

    const W = 1280, H = 720;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // 背景グラデーション
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, t.bg[0]);
    grad.addColorStop(1, t.bg[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // アクセントライン
    ctx.fillStyle = t.accent;
    ctx.fillRect(80, 32, 180, 4);

    // タイトル
    ctx.fillStyle = t.title;
    ctx.font = `bold 54px "${fontFamily}", sans-serif`;
    ctx.fillText(`♪ ${title || "セットリスト"}`, 80, 115);

    // 日付
    let startY = 178;
    if (date) {
      ctx.fillStyle = t.date;
      ctx.font = `28px "${fontFamily}", sans-serif`;
      ctx.fillText(date, 84, 158);
      startY = 210;
    }

    // 区切り線
    ctx.strokeStyle = t.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, startY - 8);
    ctx.lineTo(W - 80, startY - 8);
    ctx.stroke();

    // 曲リスト
    const lineHeight = Math.min(64, Math.floor((H - startY - 40) / Math.max(songs.length, 1)));
    const fontSize = Math.min(36, Math.floor(lineHeight * 0.72));
    songs.forEach((song, i) => {
      const y = startY + i * lineHeight + fontSize;
      ctx.fillStyle = t.num;
      ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`;
      ctx.fillText(`${i + 1}.`, 80, y);
      ctx.fillStyle = t.song;
      ctx.font = `${fontSize}px "${fontFamily}", sans-serif`;
      ctx.fillText(song, 80 + fontSize * 2.2, y);
    });

    const filename = `setlist-${Date.now()}.png`;
    const filepath = `/tmp/${filename}`;
    writeFileSync(filepath, canvas.toBuffer("image/png"));
    setTimeout(() => { try { unlinkSync(filepath); } catch { /* ignore */ } }, 10 * 60 * 1000);
    return filename;
  }

  // ユーザーごとの会話履歴（複数ターンで情報を集めるため）
  type Message = { role: "user" | "assistant"; content: string };
  const conversationHistory = new Map<string, Message[]>();
  const lastActiveMap = new Map<string, number>(); // TTL管理用
  const MAX_HISTORY = 10;
  const HISTORY_TTL = 24 * 60 * 60 * 1000; // 24時間

  // 履歴がMAX_HISTORYに達したら古い半分をClaudeで要約して圧縮
  async function compressHistory(history: Message[]): Promise<void> {
    if (history.length < MAX_HISTORY) return;
    const half = Math.floor(MAX_HISTORY / 2);
    const toSummarize = history.splice(0, half);
    try {
      const res = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 150,
        messages: [
          ...toSummarize,
          { role: "user", content: "Summarize the above conversation in 1-2 short sentences in Japanese." },
        ],
      });
      let summary = "";
      for (const block of res.content) {
        if (block.type === "text") { summary = block.text; break; }
      }
      if (summary) history.unshift({ role: "user", content: `[以前の会話の要約: ${summary}]` });
    } catch {
      // 要約失敗時は古い分はsplice済みのままで続行
    }
  }

  // グループ内でメンション後に画像を待機するためのマップ
  // key = historyKey, value = { ts: 待機開始時刻(ms), context: ユーザーの指示テキスト }
  const pendingImageState = new Map<string, { ts: number; context: string }>();
  const PENDING_IMAGE_TTL = 120_000; // 2分

  const messagingApiClient = new line.messagingApi.MessagingApiClient({
    channelAccessToken,
    baseURL: messagingApiBaseUrl,
    defaultHeaders: { "User-Agent": USER_AGENT },
  });

  const lineBlobClient = new line.messagingApi.MessagingApiBlobClient({
    channelAccessToken,
    defaultHeaders: { "User-Agent": USER_AGENT },
  });

  // グループ内でメンション判定するために Bot 自身の userId を取得
  let botUserId = "";
  let botDisplayName = "";
  try {
    const botInfo = await messagingApiClient.getBotInfo();
    botUserId = botInfo.userId;
    botDisplayName = botInfo.displayName;
    log(`[boot] botUserId=${botUserId} displayName=${botDisplayName}`);
  } catch (err: unknown) {
    log(`[boot] getBotInfo failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  function createMCPServer() {
    const server = new McpServer({
      name: "line-bot",
      version: LINE_BOT_MCP_SERVER_VERSION,
    });
    new PushTextMessage(messagingApiClient, destinationId).register(server);
    new PushFlexMessage(messagingApiClient, destinationId).register(server);
    new BroadcastTextMessage(messagingApiClient).register(server);
    new BroadcastFlexMessage(messagingApiClient).register(server);
    new GetProfile(messagingApiClient, destinationId).register(server);
    new GetMessageQuota(messagingApiClient).register(server);
    new GetRichMenuList(messagingApiClient).register(server);
    new DeleteRichMenu(messagingApiClient).register(server);
    new SetRichMenuDefault(messagingApiClient).register(server);
    new CancelRichMenuDefault(messagingApiClient).register(server);
    new CreateRichMenu(messagingApiClient, lineBlobClient).register(server);
    new GetFollowerIds(messagingApiClient).register(server);
    return server;
  }

  async function handleWebhook(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(
        Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string),
      );
    }
    const body = Buffer.concat(chunks);
    const signature = req.headers["x-line-signature"] as string;

    if (channelSecret) {
      const hash = createHmac("sha256", channelSecret)
        .update(body)
        .digest("base64");
      if (!signature || hash !== signature) {
        res.writeHead(403);
        res.end("Invalid signature");
        return;
      }
    }

    res.writeHead(200);
    res.end("OK");

    const payload = JSON.parse(body.toString());
    for (const event of payload.events ?? []) {
      // グループ/ルームに追加された時の自己紹介
      if (event.type === "join" && event.replyToken) {
        const name = botDisplayName || "豚人間くん";
        await messagingApiClient.replyMessage({
          replyToken: event.replyToken,
          messages: [{
            type: "text",
            text: `はじめまして！${name}です。\n友だち追加ありがとうございます😉\n\nバンドやグループに関する様々な雑務をお手伝いさせていただきます！\n僕に何か頼みたいときは必ず僕宛にメンションをお願いします🐷`,
          }],
        }).catch((err: unknown) => {
          log(`[webhook] join reply error: ${err instanceof Error ? err.message : String(err)}`);
        });
        continue;
      }

      if (!(event.type === "message" && event.replyToken)) continue;

      const isGroupChat = event.source?.type === "group" || event.source?.type === "room";
      const mentionees: Array<{ index: number; length: number; userId?: string }> =
        event.message?.mention?.mentionees ?? [];
      const isMentioned = mentionees.some((m) => m.userId === botUserId);
      const isAdmin = !!adminUserId && event.source?.userId === adminUserId;
      const historyKey = [
        event.source?.groupId,
        event.source?.roomId,
        event.source?.userId,
      ].filter(Boolean).join(":");

      // 現在日時（Asia/Tokyo）を system prompt に追記
      const now = new Date().toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      });
      // 管理者は Security セクションなし、それ以外はフル system prompt
      const basePrompt = isAdmin ? systemPromptAdmin : systemPrompt;
      const systemWithDate = (basePrompt ? basePrompt + "\n\n" : "")
        + `Current date/time (JST): ${now}`;

      if (event.message?.type === "text") {
        // グループ/ルームの場合はメンションされた時だけ返信（管理者も同様）
        if (isGroupChat && !isMentioned) continue;

        // メッセージからメンション部分（@Bot名）を除いてClaudeに渡す
        let userText = event.message.text as string;
        const sorted = [...mentionees].sort((a, b) => b.index - a.index);
        for (const m of sorted) {
          userText = userText.slice(0, m.index) + userText.slice(m.index + m.length);
        }
        userText = userText.trim();
        if (!userText) continue;

        // /myid コマンド：送信者の userId をそのまま返す
        if (userText === "/myid") {
          const userId = event.source?.userId ?? "(不明)";
          await messagingApiClient.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: `あなたのLINE IDは ${userId} です` }],
          }).catch((err: unknown) => {
            log(`[webhook] /myid reply error: ${err instanceof Error ? err.message : String(err)}`);
          });
          continue;
        }

        // /reset コマンド：会話履歴をクリア
        if (userText === "/reset") {
          conversationHistory.delete(historyKey);
          lastActiveMap.delete(historyKey);
          pendingImageState.delete(historyKey);
          await messagingApiClient.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: "会話履歴をリセットしました✅" }],
          }).catch((err: unknown) => {
            log(`[webhook] /reset reply error: ${err instanceof Error ? err.message : String(err)}`);
          });
          continue;
        }

        try {
          const history = conversationHistory.get(historyKey) ?? [];
          history.push({ role: "user", content: userText });
          await compressHistory(history);

          const aiResponse = await anthropic.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 1000,
            system: systemWithDate,
            messages: history,
          });

          let rawReplyText = "";
          for (const block of aiResponse.content) {
            if (block.type === "text") { rawReplyText = block.text; break; }
          }

          pendingImageState.set(historyKey, { ts: Date.now(), context: userText });

          const setlistData = parseSetlistData(rawReplyText);
          if (setlistData) {
            // セトリ画像を生成して送信
            try {
              const filename = await generateSetlistImage(setlistData.theme, setlistData.title, setlistData.date, setlistData.songs);
              const serviceUrl = process.env.RENDER_EXTERNAL_URL ?? `http://localhost:${process.env.PORT ?? "10000"}`;
              const imageUrl = `${serviceUrl}/tmp/${filename}`;
              history.push({ role: "assistant", content: `[セトリ画像: ${setlistData.title}]` });
              conversationHistory.set(historyKey, history);
              lastActiveMap.set(historyKey, Date.now());
              await messagingApiClient.replyMessage({
                replyToken: event.replyToken,
                messages: [{ type: "image", originalContentUrl: imageUrl, previewImageUrl: imageUrl }],
              });
            } catch (imgErr: unknown) {
              log(`[webhook] Setlist image error: ${imgErr instanceof Error ? imgErr.message : String(imgErr)}`);
              const fallback = `🎸 ${setlistData.title}${setlistData.date ? "\n" + setlistData.date : ""}\n\n` + setlistData.songs.map((s, i) => `${i + 1}. ${s}`).join("\n");
              history.push({ role: "assistant", content: fallback });
              conversationHistory.set(historyKey, history);
              lastActiveMap.set(historyKey, Date.now());
              await messagingApiClient.replyMessage({
                replyToken: event.replyToken,
                messages: [{ type: "text", text: fallback }],
              });
            }
          } else {
            const replyText = stripMarkdown(rawReplyText || "すみません、うまく応答できませんでした。").slice(0, 5000);
            history.push({ role: "assistant", content: replyText });
            conversationHistory.set(historyKey, history);
            lastActiveMap.set(historyKey, Date.now());
            await messagingApiClient.replyMessage({
              replyToken: event.replyToken,
              messages: [{ type: "text", text: replyText }],
            });
          }
        } catch (err: unknown) {
          log(`[webhook] Claude API error: ${err instanceof Error ? err.message : String(err)}`);
          await messagingApiClient.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: "ちょっと調子が悪いみたい😵 少し待ってから再送してね🙏" }],
          }).catch(() => { /* replyToken already used or expired */ });
        }

      } else if (event.message?.type === "image") {
        // グループ: メンション後2分以内のみ処理、1:1: 常時処理
        let imagePrompt = "この画像について教えて";
        if (isGroupChat) {
          const pending = pendingImageState.get(historyKey);
          if (!pending || Date.now() - pending.ts > PENDING_IMAGE_TTL) continue;
          imagePrompt = pending.context;
        }

        try {
          const stream = await lineBlobClient.getMessageContent(event.message.id);
          const imgChunks: Buffer[] = [];
          for await (const chunk of stream) {
            imgChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
          }
          const base64 = Buffer.concat(imgChunks).toString("base64");

          const history = conversationHistory.get(historyKey) ?? [];
          // 1:1 の場合、直前のユーザー発言を指示として使う
          if (!isGroupChat) {
            const lastUserMsg = [...history].reverse().find((m) => m.role === "user");
            if (lastUserMsg) imagePrompt = lastUserMsg.content;
          }

          const aiResponse = await anthropic.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 1000,
            system: systemWithDate,
            messages: [
              ...history,
              {
                role: "user",
                content: [
                  {
                    type: "image",
                    source: { type: "base64", media_type: "image/jpeg", data: base64 },
                  },
                  { type: "text", text: imagePrompt },
                ],
              },
            ],
          });

          let replyText = "すみません、うまく応答できませんでした。";
          for (const block of aiResponse.content) {
            if (block.type === "text") {
              replyText = stripMarkdown(block.text).slice(0, 5000);
              break;
            }
          }

          history.push({ role: "user", content: "[画像]" });
          history.push({ role: "assistant", content: replyText });
          conversationHistory.set(historyKey, history);
          lastActiveMap.set(historyKey, Date.now());

          await messagingApiClient.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: replyText }],
          });
        } catch (err: unknown) {
          log(`[webhook] Vision error: ${err instanceof Error ? err.message : String(err)}`);
          await messagingApiClient.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: "画像の処理中にエラーが起きたよ😵 少し待ってから再送してね🙏" }],
          }).catch(() => { /* replyToken already used or expired */ });
        }

      } else {
        // スタンプ・音声・ファイルなど未対応メッセージ
        if (isGroupChat && !isMentioned) continue;
        try {
          await messagingApiClient.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: "テキスト以外は対応していません🙏" }],
          });
        } catch (err: unknown) {
          log(`[webhook] Reply error: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  // 24時間非アクティブなユーザーの履歴を削除（1時間ごとにチェック）
  setInterval(() => {
    const now = Date.now();
    let count = 0;
    for (const [key, lastActive] of lastActiveMap) {
      if (now - lastActive > HISTORY_TTL) {
        conversationHistory.delete(key);
        lastActiveMap.delete(key);
        count++;
      }
    }
    if (count > 0) log(`[history] Expired ${count} inactive conversation(s)`);
  }, 60 * 60 * 1000); // 1時間ごと

  return {
    createMCPServer,
    handleWebhook,
    SSEServerTransport,
    StdioServerTransport,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const port = parseInt(process.env.PORT ?? "10000");

  log(`[startup] CHANNEL_ACCESS_TOKEN=${process.env.CHANNEL_ACCESS_TOKEN ? "set" : "NOT SET"}`);
  log(`[startup] ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY ? "set" : "NOT SET"}`);
  log(`[startup] Calling httpServer.listen(${port})...`);

  const transports: Record<string, InstanceType<typeof import("@modelcontextprotocol/sdk/server/sse.js")["SSEServerTransport"]>> = {};

  const httpServer = createServer((req, res) => {
    (async () => {
      if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
        res.writeHead(200);
        res.end("LINE Bot MCP Server is running");
        return;
      }

      // セトリ画像の配信 (/tmp/setlist-*.png)
      if (req.method === "GET" && req.url?.startsWith("/tmp/")) {
        const filename = req.url.slice(5);
        if (!/^setlist-\d+\.png$/.test(filename)) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        try {
          const data = readFileSync(`/tmp/${filename}`);
          res.writeHead(200, { "Content-Type": "image/png" });
          res.end(data);
        } catch {
          res.writeHead(404);
          res.end("Not found");
        }
        return;
      }

      const app = await getApp();

      if (req.method === "POST" && req.url === "/webhook") {
        await app.handleWebhook(req, res);
      } else if (req.method === "GET" && req.url === "/sse") {
        const server = app.createMCPServer();
        const transport = new app.SSEServerTransport("/message", res);
        transports[transport.sessionId] = transport;
        res.on("close", () => {
          delete transports[transport.sessionId];
        });
        await server.connect(transport);
      } else if (req.method === "POST" && req.url?.startsWith("/message")) {
        const sessionId = new URL(req.url, "http://localhost").searchParams.get("sessionId");
        if (sessionId && transports[sessionId]) {
          await transports[sessionId].handlePostMessage(req, res);
        } else {
          res.writeHead(404);
          res.end("Session not found");
        }
      } else {
        res.writeHead(200);
        res.end("LINE Bot MCP Server is running");
      }
    })().catch(err => {
      log(`[request] Error: ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end("Internal server error");
      }
    });
  });

  // Do NOT call process.exit() in error handler — set exitCode and let the
  // event loop drain so stdout/stderr buffers are flushed before exit.
  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    log(`[startup] HTTP server error: ${err.code} ${err.message}`);
    process.exitCode = 1;
  });

  // Simple callback-based listen — no Promise/await wrapper that could
  // interfere with error propagation.
  httpServer.listen(port, () => {
    log(`[startup] HTTP server listening on port ${port}`);

    if (!process.env.CHANNEL_ACCESS_TOKEN) {
      log("[startup] WARNING: CHANNEL_ACCESS_TOKEN not set — API calls will fail");
    }

    getApp()
      .then(() => log("[startup] Application ready"))
      .catch(err => log(`[startup] Module load failed: ${err.message}\n${err.stack}`));

    // Self-ping every 10 minutes to prevent Render free tier from spinning down
    // RENDER_EXTERNAL_URL があれば外部経由で ping（Render のルーティング層を通すことでアイドルスピンダウンを防ぐ）
    const selfUrl = process.env.RENDER_EXTERNAL_URL
      ? `${process.env.RENDER_EXTERNAL_URL}/health`
      : `http://localhost:${port}/health`;
    setInterval(() => {
      import("node:http").then(({ request }) => {
        const req = request(selfUrl, (res) => {
          res.resume(); // drain response
          log(`[keepalive] self-ping ${res.statusCode}`);
        });
        req.on("error", (err) => log(`[keepalive] self-ping error: ${err.message}`));
        req.end();
      });
    }, 10 * 60 * 1000); // 10分
  });
}

main().catch(err => {
  log(`[fatal] main() failed: ${err.message}\n${err.stack}`);
  process.exitCode = 1;
});
