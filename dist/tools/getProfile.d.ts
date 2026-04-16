import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { messagingApi } from "@line/bot-sdk";
import { AbstractTool } from "./AbstractTool.js";
export default class GetProfile extends AbstractTool {
    private client;
    private destinationId;
    constructor(client: messagingApi.MessagingApiClient, destinationId: string);
    register(server: McpServer): void;
}
//# sourceMappingURL=getProfile.d.ts.map