import { createErrorResponse, createSuccessResponse, } from "../common/response.js";
import { AbstractTool } from "./AbstractTool.js";
import { textMessageSchema } from "../common/schema/textMessage.js";
export default class BroadcastTextMessage extends AbstractTool {
    client;
    constructor(client) {
        super();
        this.client = client;
    }
    register(server) {
        server.registerTool("broadcast_text_message", {
            title: "Broadcast Text Message",
            description: "Broadcast a simple text message via LINE to all users who have followed your LINE Official Account. Use this for sending " +
                "plain text messages without formatting. Please be aware that this message will be sent to all users.",
            inputSchema: {
                message: textMessageSchema,
            },
            annotations: {
                destructiveHint: true,
            },
        }, async ({ message }) => {
            try {
                const response = await this.client.broadcast({
                    messages: [message],
                });
                return createSuccessResponse(response);
            }
            catch (error) {
                return createErrorResponse(`Failed to broadcast message: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
}
//# sourceMappingURL=broadcastTextMessage.js.map