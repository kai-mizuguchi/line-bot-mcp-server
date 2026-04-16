import { z } from "zod";
export declare const textMessageSchema: z.ZodObject<{
    type: z.ZodDefault<z.ZodLiteral<"text">>;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "text";
    text: string;
}, {
    text: string;
    type?: "text" | undefined;
}>;
//# sourceMappingURL=textMessage.d.ts.map