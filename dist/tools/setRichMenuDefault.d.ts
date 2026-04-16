import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { messagingApi } from "@line/bot-sdk";
import { AbstractTool } from "./AbstractTool.js";
export default class SetRichMenuDefault extends AbstractTool {
    private client;
    constructor(client: messagingApi.MessagingApiClient);
    register(server: McpServer): void;
}
//# sourceMappingURL=setRichMenuDefault.d.ts.map