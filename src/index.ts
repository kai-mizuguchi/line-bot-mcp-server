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

// Static imports: ONLY Node.js built-ins.
// Third-party packages are loaded dynamically AFTER the HTTP server binds to
// its port, so Render's port-detection succeeds even on slow/OOM starts.
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { createHmac } from "node:crypto";

// All logs use console.log (stdout) so Render captures them unconditionally.
console.log(`[boot] Node.js ${process.version} started. PORT=${process.env.PORT ?? "(not set)"}, NODE_ENV=${process.env.NODE_ENV ?? "(not set)"}`);

process.on("uncaughtException", err => {
  console.log(`[fatal] uncaughtException: ${err.message}\n${err.stack}`);
  process.exit(1);
});
process.on("unhandledRejection", reason => {
  console.log(`[fatal] unhandledRejection: ${reason}`);
  process.exit(1);
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
  console.log("[boot] Loading npm modules...");

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
  ]);

  console.log("[boot] npm modules loaded OK");

  const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN || "";
  const channelSecret = process.env.CHANNEL_SECRET || "";
  const destinationId = process.env.DESTINATION_USER_ID || "";
  const messagingApiBaseUrl = process.env.LINE_MESSAGING_API_BASE_URL;

  const messagingApiClient = new line.messagingApi.MessagingApiClient({
    channelAccessToken,
    baseURL: messagingApiBaseUrl,
    defaultHeaders: { "User-Agent": USER_AGENT },
  });

  const lineBlobClient = new line.messagingApi.MessagingApiBlobClient({
    channelAccessToken,
    defaultHeaders: { "User-Agent": USER_AGENT },
  });

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
      if (event.type === "message" && event.replyToken) {
        await messagingApiClient.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: "Claudeです！" }],
        });
      }
    }
  }

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
  const port = parseInt(process.env.PORT || "10000");

  console.log(`[startup] CHANNEL_ACCESS_TOKEN=${process.env.CHANNEL_ACCESS_TOKEN ? "set" : "NOT SET"}`);
  console.log(`[startup] Binding HTTP server on 0.0.0.0:${port}...`);

  const transports: Record<string, InstanceType<typeof import("@modelcontextprotocol/sdk/server/sse.js")["SSEServerTransport"]>> = {};

  const httpServer = createServer((req, res) => {
    (async () => {
      if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
        res.writeHead(200);
        res.end("LINE Bot MCP Server is running");
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
      console.log(`[request] Error: ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end("Internal server error");
      }
    });
  });

  httpServer.on("error", err => {
    console.log(`[startup] HTTP server error: ${err.message}`);
    process.exit(1);
  });

  // Bind to 0.0.0.0 explicitly so Render's port scanner detects the port.
  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, "0.0.0.0", () => {
      httpServer.removeListener("error", reject);
      resolve();
    });
  });

  console.log(`[startup] HTTP server listening on 0.0.0.0:${port}`);

  if (!process.env.CHANNEL_ACCESS_TOKEN) {
    console.log("[startup] WARNING: CHANNEL_ACCESS_TOKEN not set — MCP tools will fail at runtime");
  }

  // Load npm modules in the background after the port is bound.
  getApp()
    .then(() => console.log("[startup] Application ready"))
    .catch(err => console.log(`[startup] Module load failed: ${err.message}\n${err.stack}`));
}

main().catch(err => {
  console.log(`[fatal] main() failed: ${err.message}\n${err.stack}`);
  process.exit(1);
});
