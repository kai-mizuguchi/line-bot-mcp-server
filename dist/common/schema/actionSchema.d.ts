import { z } from "zod";
export declare const actionSchema: z.ZodUnion<[z.ZodObject<{
    type: z.ZodLiteral<"postback">;
    label: z.ZodString;
    data: z.ZodString;
    displayText: z.ZodOptional<z.ZodString>;
    inputOption: z.ZodOptional<z.ZodEnum<["closeRichMenu", "openRichMenu", "openKeyboard", "openVoice"]>>;
    fillInText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "postback";
    data: string;
    label: string;
    displayText?: string | undefined;
    inputOption?: "closeRichMenu" | "openRichMenu" | "openKeyboard" | "openVoice" | undefined;
    fillInText?: string | undefined;
}, {
    type: "postback";
    data: string;
    label: string;
    displayText?: string | undefined;
    inputOption?: "closeRichMenu" | "openRichMenu" | "openKeyboard" | "openVoice" | undefined;
    fillInText?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"message">;
    label: z.ZodString;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "message";
    label: string;
    text: string;
}, {
    type: "message";
    label: string;
    text: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"uri">;
    label: z.ZodString;
    uri: z.ZodString;
    altUri: z.ZodOptional<z.ZodObject<{
        desktop: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        desktop?: string | undefined;
    }, {
        desktop?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "uri";
    label: string;
    uri: string;
    altUri?: {
        desktop?: string | undefined;
    } | undefined;
}, {
    type: "uri";
    label: string;
    uri: string;
    altUri?: {
        desktop?: string | undefined;
    } | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"datetimepicker">;
    label: z.ZodString;
    data: z.ZodString;
    mode: z.ZodEnum<["date", "time", "datetime"]>;
    initial: z.ZodOptional<z.ZodString>;
    max: z.ZodOptional<z.ZodString>;
    min: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "datetimepicker";
    data: string;
    label: string;
    mode: "time" | "date" | "datetime";
    max?: string | undefined;
    min?: string | undefined;
    initial?: string | undefined;
}, {
    type: "datetimepicker";
    data: string;
    label: string;
    mode: "time" | "date" | "datetime";
    max?: string | undefined;
    min?: string | undefined;
    initial?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"camera">;
    label: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "camera";
    label: string;
}, {
    type: "camera";
    label: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"cameraRoll">;
    label: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "cameraRoll";
    label: string;
}, {
    type: "cameraRoll";
    label: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"location">;
    label: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "location";
    label: string;
}, {
    type: "location";
    label: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"richmenuswitch">;
    label: z.ZodString;
    richMenuAliasId: z.ZodString;
    data: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "richmenuswitch";
    data: string;
    label: string;
    richMenuAliasId: string;
}, {
    type: "richmenuswitch";
    data: string;
    label: string;
    richMenuAliasId: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"clipboard">;
    label: z.ZodString;
    clipboardText: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "clipboard";
    label: string;
    clipboardText: string;
}, {
    type: "clipboard";
    label: string;
    clipboardText: string;
}>]>;
//# sourceMappingURL=actionSchema.d.ts.map