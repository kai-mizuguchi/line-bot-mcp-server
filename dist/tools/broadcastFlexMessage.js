import { createErrorResponse, createSuccessResponse, } from "../common/response.js";
import { AbstractTool } from "./AbstractTool.js";
import { flexMessageSchema } from "../common/schema/flexMessage.js";
export default class BroadcastFlexMessage extends AbstractTool {
    client;
    constructor(client) {
        super();
        this.client = client;
    }
    register(server) {
        server.registerTool("broadcast_flex_message", {
            title: "Broadcast Flex Message",
            description: "Broadcast a highly customizable flex message via LINE to all users who have added your LINE Official Account. " +
                "Supports both bubble (single container) and carousel (multiple swipeable bubbles) layouts. Please be aware that " +
                "this message will be sent to all users.",
            inputSchema: {
                message: flexMessageSchema,
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
//# sourceMappingURL=broadcastFlexMessage.js.map