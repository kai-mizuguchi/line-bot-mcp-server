import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { messagingApi } from "@line/bot-sdk";
import { AbstractTool } from "./AbstractTool.js";
export default class CancelRichMenuDefault extends AbstractTool {
    private client;
    constructor(client: messagingApi.MessagingApiClient);
    register(server: McpServer): void;
}
//# sourceMappingURL=cancelRichMenuDefault.d.ts.map