import { createErrorResponse, createSuccessResponse, } from "../common/response.js";
import { AbstractTool } from "./AbstractTool.js";
export default class GetRichMenuList extends AbstractTool {
    client;
    constructor(client) {
        super();
        this.client = client;
    }
    register(server) {
        server.registerTool("get_rich_menu_list", {
            title: "Get Rich Menu List",
            description: "Get the list of rich menus associated with your LINE Official Account.",
            annotations: {
                readOnlyHint: true,
            },
        }, async () => {
            try {
                const response = await this.client.getRichMenuList();
                return createSuccessResponse(response);
            }
            catch (error) {
                return createErrorResponse(`Failed to get rich menu list: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
}
//# sourceMappingURL=getRichMenuList.js.map