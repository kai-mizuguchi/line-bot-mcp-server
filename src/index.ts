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

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { createHmac } from "node:crypto";
import * as line from "@line/bot-sdk";
import { LINE_BOT_MCP_SERVER_VERSION, USER_AGENT } from "./version.js";
import CancelRichMenuDefault from "./tools/cancelRichMenuDefault.js";
import PushTextMessage from "./tools/pushTextMessage.js";
import PushFlexMessage from "./tools/pushFlexMessage.js";
import BroadcastTextMessage from "./tools/broadcastTextMessage.js";
import BroadcastFlexMessage from "./tools/broadcastFlexMessage.js";
import GetProfile from "./tools/getProfile.js";
import GetMessageQuota from "./tools/getMessageQuota.js";
import GetRichMenuList from "./tools/getRichMenuList.js";
import DeleteRichMenu from "./tools/deleteRichMenu.js";
import SetRichMenuDefault from "./tools/setRichMenuDefault.js";
import CreateRichMenu from "./tools/createRichMenu.js";
import GetFollowerIds from "./tools/getFollowerIds.js";

// Early boot diagnostic — runs after all static imports resolve
process.stderr.write(
  `[boot] index.js loaded OK. PORT=${process.env.PORT ?? "(not set)"}, NODE_ENV=${process.env.NODE_ENV ?? "(not set)"}\n`,
);

process.on("uncaughtException", err => {
  process.stderr.write(
    `[boot] uncaughtException: ${err.message}\n${err.stack}\n`,
  );
  process.exit(1);
});

process.on("unhandledRejection", reason => {
  process.stderr.write(`[boot] unhandledRejection: ${reason}\n`);
  process.exit(1);
});

const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN || "";
const channelSecret = process.env.CHANNEL_SECRET || "";
const destinationId = process.env.DESTINATION_USER_ID || "";
const messagingApiBaseUrl = process.env.LINE_MESSAGING_API_BASE_URL;

const messagingApiClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: channelAccessToken,
  baseURL: messagingApiBaseUrl,
  defaultHeaders: {
    "User-Agent": USER_AGENT,
  },
});

const lineBlobClient = new line.messagingApi.MessagingApiBlobClient({
  channelAccessToken: channelAccessToken,
  defaultHeaders: {
    "User-Agent": USER_AGENT,
  },
});

function createMCPServer(): McpServer {
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

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  return Buffer.concat(chunks);
}

function verifyLineSignature(
  body: Buffer,
  signature: string,
  secret: string,
): boolean {
  const hash = createHmac("sha256", secret).update(body).digest("base64");
  return hash === signature;
}

async function handleWebhook(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = await readBody(req);
  const signature = req.headers["x-line-signature"] as string;

  if (channelSecret) {
    if (!signature || !verifyLineSignature(body, signature, channelSecret)) {
      res.writeHead(403);
      res.end("Invalid signature");
      return;
    }
  }

  res.writeHead(200);
  res.end("OK");

  const payload = JSON.parse(body.toString());
  for (const event of payload.events ?? []) {
    if (event.type === "message" && event.replyToken) {
      await messagingApiClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: "text", text: "Claudeです！" }],
      });
    }
  }
}

async function main() {
  console.error(
    `[startup] LINE Bot MCP Server v${LINE_BOT_MCP_SERVER_VERSION} starting...`,
  );
  console.error(`[startup] PORT=${process.env.PORT ?? "(not set)"}`);
  console.error(
    `[startup] CHANNEL_ACCESS_TOKEN=${process.env.CHANNEL_ACCESS_TOKEN ? "set" : "not set"}`,
  );

  if (!process.env.CHANNEL_ACCESS_TOKEN) {
    console.error("Please set CHANNEL_ACCESS_TOKEN");
    process.exit(1);
  }

  // Use PORT if set (Render injects it for Web Services).
  // Fall back to 10000 when stdin is not a TTY (e.g. Docker without PORT).
  const port = process.env.PORT || (!process.stdin.isTTY ? "10000" : "");

  if (port) {
    const transports: Record<string, SSEServerTransport> = {};

    const httpServer = createServer((req, res) => {
      (async () => {
        if (req.method === "POST" && req.url === "/webhook") {
          await handleWebhook(req, res);
        } else if (req.method === "GET" && req.url === "/sse") {
          const server = createMCPServer();
          const transport = new SSEServerTransport("/message", res);
          transports[transport.sessionId] = transport;

          res.on("close", () => {
            delete transports[transport.sessionId];
          });

          await server.connect(transport);
        } else if (req.method === "POST" && req.url?.startsWith("/message")) {
          const url = new URL(req.url, `http://localhost`);
          const sessionId = url.searchParams.get("sessionId");

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
      })().catch(error => {
        console.error("Error handling request:", error);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end("Internal server error");
        }
      });
    });

    httpServer.on("error", err => {
      console.error("HTTP server error:", err);
      process.exit(1);
    });

    httpServer.listen(parseInt(port), () => {
      console.error(`[startup] HTTP server listening on port ${port}`);
    });
  } else {
    const server = createMCPServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch(error => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
