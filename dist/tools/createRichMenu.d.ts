import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { messagingApi } from "@line/bot-sdk";
import { AbstractTool } from "./AbstractTool.js";
export default class CreateRichMenu extends AbstractTool {
    private client;
    private lineBlobClient;
    constructor(client: messagingApi.MessagingApiClient, lineBlobClient: messagingApi.MessagingApiBlobClient);
    register(server: McpServer): void;
}
//# sourceMappingURL=createRichMenu.d.ts.map