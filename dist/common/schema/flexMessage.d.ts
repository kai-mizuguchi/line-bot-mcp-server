import { z } from "zod";
export declare const flexBubbleSchema: z.ZodObject<{
    type: z.ZodLiteral<"bubble">;
    size: z.ZodOptional<z.ZodEnum<["nano", "micro", "deca", "hecto", "kilo", "mega", "giga"]>>;
    direction: z.ZodOptional<z.ZodEnum<["ltr", "rtl"]>>;
    header: z.ZodEffects<z.ZodOptional<z.ZodType<any, z.ZodTypeDef, any>>, any, any>;
    hero: z.ZodOptional<z.ZodType<any, z.ZodTypeDef, any>>;
    body: z.ZodEffects<z.ZodOptional<z.ZodType<any, z.ZodTypeDef, any>>, any, any>;
    footer: z.ZodEffects<z.ZodOptional<z.ZodType<any, z.ZodTypeDef, any>>, any, any>;
    styles: z.ZodOptional<z.ZodObject<{
        header: z.ZodOptional<z.ZodObject<{
            backgroundColor: z.ZodOptional<z.ZodString>;
            separator: z.ZodOptional<z.ZodBoolean>;
            separatorColor: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        }, {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        }>>;
        hero: z.ZodOptional<z.ZodObject<{
            backgroundColor: z.ZodOptional<z.ZodString>;
            separator: z.ZodOptional<z.ZodBoolean>;
            separatorColor: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        }, {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        }>>;
        body: z.ZodOptional<z.ZodObject<{
            backgroundColor: z.ZodOptional<z.ZodString>;
            separator: z.ZodOptional<z.ZodBoolean>;
            separatorColor: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        }, {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        }>>;
        footer: z.ZodOptional<z.ZodObject<{
            backgroundColor: z.ZodOptional<z.ZodString>;
            separator: z.ZodOptional<z.ZodBoolean>;
            separatorColor: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        }, {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        body?: {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        } | undefined;
        footer?: {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        } | undefined;
        header?: {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        } | undefined;
        hero?: {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        } | undefined;
    }, {
        body?: {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        } | undefined;
        footer?: {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        } | undefined;
        header?: {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        } | undefined;
        hero?: {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        } | undefined;
    }>>;
    action: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"postback">;
        data: z.ZodString;
        label: z.ZodString;
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
            desktop: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            desktop: string;
        }, {
            desktop: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "uri";
        label: string;
        uri: string;
        altUri?: {
            desktop: string;
        } | undefined;
    }, {
        type: "uri";
        label: string;
        uri: string;
        altUri?: {
            desktop: string;
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
    }>]>>;
}, "strip", z.ZodTypeAny, {
    type: "bubble";
    size?: "nano" | "micro" | "deca" | "hecto" | "kilo" | "mega" | "giga" | undefined;
    direction?: "ltr" | "rtl" | undefined;
    body?: any;
    footer?: any;
    header?: any;
    action?: {
        type: "postback";
        data: string;
        label: string;
        displayText?: string | undefined;
        inputOption?: "closeRichMenu" | "openRichMenu" | "openKeyboard" | "openVoice" | undefined;
        fillInText?: string | undefined;
    } | {
        type: "message";
        label: string;
        text: string;
    } | {
        type: "uri";
        label: string;
        uri: string;
        altUri?: {
            desktop: string;
        } | undefined;
    } | {
        type: "datetimepicker";
        data: string;
        label: string;
        mode: "time" | "date" | "datetime";
        max?: string | undefined;
        min?: string | undefined;
        initial?: string | undefined;
    } | {
        type: "camera";
        label: string;
    } | {
        type: "cameraRoll";
        label: string;
    } | {
        type: "location";
        label: string;
    } | {
        type: "richmenuswitch";
        data: string;
        label: string;
        richMenuAliasId: string;
    } | {
        type: "clipboard";
        label: string;
        clipboardText: string;
    } | undefined;
    hero?: any;
    styles?: {
        body?: {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        } | undefined;
        footer?: {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        } | undefined;
        header?: {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        } | undefined;
        hero?: {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        } | undefined;
    } | undefined;
}, {
    type: "bubble";
    size?: "nano" | "micro" | "deca" | "hecto" | "kilo" | "mega" | "giga" | undefined;
    direction?: "ltr" | "rtl" | undefined;
    body?: any;
    footer?: any;
    header?: any;
    action?: {
        type: "postback";
        data: string;
        label: string;
        displayText?: string | undefined;
        inputOption?: "closeRichMenu" | "openRichMenu" | "openKeyboard" | "openVoice" | undefined;
        fillInText?: string | undefined;
    } | {
        type: "message";
        label: string;
        text: string;
    } | {
        type: "uri";
        label: string;
        uri: string;
        altUri?: {
            desktop: string;
        } | undefined;
    } | {
        type: "datetimepicker";
        data: string;
        label: string;
        mode: "time" | "date" | "datetime";
        max?: string | undefined;
        min?: string | undefined;
        initial?: string | undefined;
    } | {
        type: "camera";
        label: string;
    } | {
        type: "cameraRoll";
        label: string;
    } | {
        type: "location";
        label: string;
    } | {
        type: "richmenuswitch";
        data: string;
        label: string;
        richMenuAliasId: string;
    } | {
        type: "clipboard";
        label: string;
        clipboardText: string;
    } | undefined;
    hero?: any;
    styles?: {
        body?: {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        } | undefined;
        footer?: {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        } | undefined;
        header?: {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        } | undefined;
        hero?: {
            backgroundColor?: string | undefined;
            separator?: boolean | undefined;
            separatorColor?: string | undefined;
        } | undefined;
    } | undefined;
}>;
export declare const flexMessageSchema: z.ZodObject<{
    type: z.ZodDefault<z.ZodLiteral<"flex">>;
    altText: z.ZodString;
    contents: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"bubble">;
        size: z.ZodOptional<z.ZodEnum<["nano", "micro", "deca", "hecto", "kilo", "mega", "giga"]>>;
        direction: z.ZodOptional<z.ZodEnum<["ltr", "rtl"]>>;
        header: z.ZodEffects<z.ZodOptional<z.ZodType<any, z.ZodTypeDef, any>>, any, any>;
        hero: z.ZodOptional<z.ZodType<any, z.ZodTypeDef, any>>;
        body: z.ZodEffects<z.ZodOptional<z.ZodType<any, z.ZodTypeDef, any>>, any, any>;
        footer: z.ZodEffects<z.ZodOptional<z.ZodType<any, z.ZodTypeDef, any>>, any, any>;
        styles: z.ZodOptional<z.ZodObject<{
            header: z.ZodOptional<z.ZodObject<{
                backgroundColor: z.ZodOptional<z.ZodString>;
                separator: z.ZodOptional<z.ZodBoolean>;
                separatorColor: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            }, {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            }>>;
            hero: z.ZodOptional<z.ZodObject<{
                backgroundColor: z.ZodOptional<z.ZodString>;
                separator: z.ZodOptional<z.ZodBoolean>;
                separatorColor: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            }, {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            }>>;
            body: z.ZodOptional<z.ZodObject<{
                backgroundColor: z.ZodOptional<z.ZodString>;
                separator: z.ZodOptional<z.ZodBoolean>;
                separatorColor: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            }, {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            }>>;
            footer: z.ZodOptional<z.ZodObject<{
                backgroundColor: z.ZodOptional<z.ZodString>;
                separator: z.ZodOptional<z.ZodBoolean>;
                separatorColor: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            }, {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            body?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            footer?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            header?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            hero?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
        }, {
            body?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            footer?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            header?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            hero?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
        }>>;
        action: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            type: z.ZodLiteral<"postback">;
            data: z.ZodString;
            label: z.ZodString;
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
                desktop: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                desktop: string;
            }, {
                desktop: string;
            }>>;
        }, "strip", z.ZodTypeAny, {
            type: "uri";
            label: string;
            uri: string;
            altUri?: {
                desktop: string;
            } | undefined;
        }, {
            type: "uri";
            label: string;
            uri: string;
            altUri?: {
                desktop: string;
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
        }>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "bubble";
        size?: "nano" | "micro" | "deca" | "hecto" | "kilo" | "mega" | "giga" | undefined;
        direction?: "ltr" | "rtl" | undefined;
        body?: any;
        footer?: any;
        header?: any;
        action?: {
            type: "postback";
            data: string;
            label: string;
            displayText?: string | undefined;
            inputOption?: "closeRichMenu" | "openRichMenu" | "openKeyboard" | "openVoice" | undefined;
            fillInText?: string | undefined;
        } | {
            type: "message";
            label: string;
            text: string;
        } | {
            type: "uri";
            label: string;
            uri: string;
            altUri?: {
                desktop: string;
            } | undefined;
        } | {
            type: "datetimepicker";
            data: string;
            label: string;
            mode: "time" | "date" | "datetime";
            max?: string | undefined;
            min?: string | undefined;
            initial?: string | undefined;
        } | {
            type: "camera";
            label: string;
        } | {
            type: "cameraRoll";
            label: string;
        } | {
            type: "location";
            label: string;
        } | {
            type: "richmenuswitch";
            data: string;
            label: string;
            richMenuAliasId: string;
        } | {
            type: "clipboard";
            label: string;
            clipboardText: string;
        } | undefined;
        hero?: any;
        styles?: {
            body?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            footer?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            header?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            hero?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
        } | undefined;
    }, {
        type: "bubble";
        size?: "nano" | "micro" | "deca" | "hecto" | "kilo" | "mega" | "giga" | undefined;
        direction?: "ltr" | "rtl" | undefined;
        body?: any;
        footer?: any;
        header?: any;
        action?: {
            type: "postback";
            data: string;
            label: string;
            displayText?: string | undefined;
            inputOption?: "closeRichMenu" | "openRichMenu" | "openKeyboard" | "openVoice" | undefined;
            fillInText?: string | undefined;
        } | {
            type: "message";
            label: string;
            text: string;
        } | {
            type: "uri";
            label: string;
            uri: string;
            altUri?: {
                desktop: string;
            } | undefined;
        } | {
            type: "datetimepicker";
            data: string;
            label: string;
            mode: "time" | "date" | "datetime";
            max?: string | undefined;
            min?: string | undefined;
            initial?: string | undefined;
        } | {
            type: "camera";
            label: string;
        } | {
            type: "cameraRoll";
            label: string;
        } | {
            type: "location";
            label: string;
        } | {
            type: "richmenuswitch";
            data: string;
            label: string;
            richMenuAliasId: string;
        } | {
            type: "clipboard";
            label: string;
            clipboardText: string;
        } | undefined;
        hero?: any;
        styles?: {
            body?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            footer?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            header?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            hero?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
        } | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"carousel">;
        contents: z.ZodArray<z.ZodObject<{
            type: z.ZodLiteral<"bubble">;
            size: z.ZodOptional<z.ZodEnum<["nano", "micro", "deca", "hecto", "kilo", "mega", "giga"]>>;
            direction: z.ZodOptional<z.ZodEnum<["ltr", "rtl"]>>;
            header: z.ZodEffects<z.ZodOptional<z.ZodType<any, z.ZodTypeDef, any>>, any, any>;
            hero: z.ZodOptional<z.ZodType<any, z.ZodTypeDef, any>>;
            body: z.ZodEffects<z.ZodOptional<z.ZodType<any, z.ZodTypeDef, any>>, any, any>;
            footer: z.ZodEffects<z.ZodOptional<z.ZodType<any, z.ZodTypeDef, any>>, any, any>;
            styles: z.ZodOptional<z.ZodObject<{
                header: z.ZodOptional<z.ZodObject<{
                    backgroundColor: z.ZodOptional<z.ZodString>;
                    separator: z.ZodOptional<z.ZodBoolean>;
                    separatorColor: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                }, {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                }>>;
                hero: z.ZodOptional<z.ZodObject<{
                    backgroundColor: z.ZodOptional<z.ZodString>;
                    separator: z.ZodOptional<z.ZodBoolean>;
                    separatorColor: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                }, {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                }>>;
                body: z.ZodOptional<z.ZodObject<{
                    backgroundColor: z.ZodOptional<z.ZodString>;
                    separator: z.ZodOptional<z.ZodBoolean>;
                    separatorColor: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                }, {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                }>>;
                footer: z.ZodOptional<z.ZodObject<{
                    backgroundColor: z.ZodOptional<z.ZodString>;
                    separator: z.ZodOptional<z.ZodBoolean>;
                    separatorColor: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                }, {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                body?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                footer?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                header?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                hero?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
            }, {
                body?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                footer?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                header?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                hero?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
            }>>;
            action: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
                type: z.ZodLiteral<"postback">;
                data: z.ZodString;
                label: z.ZodString;
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
                    desktop: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    desktop: string;
                }, {
                    desktop: string;
                }>>;
            }, "strip", z.ZodTypeAny, {
                type: "uri";
                label: string;
                uri: string;
                altUri?: {
                    desktop: string;
                } | undefined;
            }, {
                type: "uri";
                label: string;
                uri: string;
                altUri?: {
                    desktop: string;
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
            }>]>>;
        }, "strip", z.ZodTypeAny, {
            type: "bubble";
            size?: "nano" | "micro" | "deca" | "hecto" | "kilo" | "mega" | "giga" | undefined;
            direction?: "ltr" | "rtl" | undefined;
            body?: any;
            footer?: any;
            header?: any;
            action?: {
                type: "postback";
                data: string;
                label: string;
                displayText?: string | undefined;
                inputOption?: "closeRichMenu" | "openRichMenu" | "openKeyboard" | "openVoice" | undefined;
                fillInText?: string | undefined;
            } | {
                type: "message";
                label: string;
                text: string;
            } | {
                type: "uri";
                label: string;
                uri: string;
                altUri?: {
                    desktop: string;
                } | undefined;
            } | {
                type: "datetimepicker";
                data: string;
                label: string;
                mode: "time" | "date" | "datetime";
                max?: string | undefined;
                min?: string | undefined;
                initial?: string | undefined;
            } | {
                type: "camera";
                label: string;
            } | {
                type: "cameraRoll";
                label: string;
            } | {
                type: "location";
                label: string;
            } | {
                type: "richmenuswitch";
                data: string;
                label: string;
                richMenuAliasId: string;
            } | {
                type: "clipboard";
                label: string;
                clipboardText: string;
            } | undefined;
            hero?: any;
            styles?: {
                body?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                footer?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                header?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                hero?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
            } | undefined;
        }, {
            type: "bubble";
            size?: "nano" | "micro" | "deca" | "hecto" | "kilo" | "mega" | "giga" | undefined;
            direction?: "ltr" | "rtl" | undefined;
            body?: any;
            footer?: any;
            header?: any;
            action?: {
                type: "postback";
                data: string;
                label: string;
                displayText?: string | undefined;
                inputOption?: "closeRichMenu" | "openRichMenu" | "openKeyboard" | "openVoice" | undefined;
                fillInText?: string | undefined;
            } | {
                type: "message";
                label: string;
                text: string;
            } | {
                type: "uri";
                label: string;
                uri: string;
                altUri?: {
                    desktop: string;
                } | undefined;
            } | {
                type: "datetimepicker";
                data: string;
                label: string;
                mode: "time" | "date" | "datetime";
                max?: string | undefined;
                min?: string | undefined;
                initial?: string | undefined;
            } | {
                type: "camera";
                label: string;
            } | {
                type: "cameraRoll";
                label: string;
            } | {
                type: "location";
                label: string;
            } | {
                type: "richmenuswitch";
                data: string;
                label: string;
                richMenuAliasId: string;
            } | {
                type: "clipboard";
                label: string;
                clipboardText: string;
            } | undefined;
            hero?: any;
            styles?: {
                body?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                footer?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                header?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                hero?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
            } | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "carousel";
        contents: {
            type: "bubble";
            size?: "nano" | "micro" | "deca" | "hecto" | "kilo" | "mega" | "giga" | undefined;
            direction?: "ltr" | "rtl" | undefined;
            body?: any;
            footer?: any;
            header?: any;
            action?: {
                type: "postback";
                data: string;
                label: string;
                displayText?: string | undefined;
                inputOption?: "closeRichMenu" | "openRichMenu" | "openKeyboard" | "openVoice" | undefined;
                fillInText?: string | undefined;
            } | {
                type: "message";
                label: string;
                text: string;
            } | {
                type: "uri";
                label: string;
                uri: string;
                altUri?: {
                    desktop: string;
                } | undefined;
            } | {
                type: "datetimepicker";
                data: string;
                label: string;
                mode: "time" | "date" | "datetime";
                max?: string | undefined;
                min?: string | undefined;
                initial?: string | undefined;
            } | {
                type: "camera";
                label: string;
            } | {
                type: "cameraRoll";
                label: string;
            } | {
                type: "location";
                label: string;
            } | {
                type: "richmenuswitch";
                data: string;
                label: string;
                richMenuAliasId: string;
            } | {
                type: "clipboard";
                label: string;
                clipboardText: string;
            } | undefined;
            hero?: any;
            styles?: {
                body?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                footer?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                header?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                hero?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
            } | undefined;
        }[];
    }, {
        type: "carousel";
        contents: {
            type: "bubble";
            size?: "nano" | "micro" | "deca" | "hecto" | "kilo" | "mega" | "giga" | undefined;
            direction?: "ltr" | "rtl" | undefined;
            body?: any;
            footer?: any;
            header?: any;
            action?: {
                type: "postback";
                data: string;
                label: string;
                displayText?: string | undefined;
                inputOption?: "closeRichMenu" | "openRichMenu" | "openKeyboard" | "openVoice" | undefined;
                fillInText?: string | undefined;
            } | {
                type: "message";
                label: string;
                text: string;
            } | {
                type: "uri";
                label: string;
                uri: string;
                altUri?: {
                    desktop: string;
                } | undefined;
            } | {
                type: "datetimepicker";
                data: string;
                label: string;
                mode: "time" | "date" | "datetime";
                max?: string | undefined;
                min?: string | undefined;
                initial?: string | undefined;
            } | {
                type: "camera";
                label: string;
            } | {
                type: "cameraRoll";
                label: string;
            } | {
                type: "location";
                label: string;
            } | {
                type: "richmenuswitch";
                data: string;
                label: string;
                richMenuAliasId: string;
            } | {
                type: "clipboard";
                label: string;
                clipboardText: string;
            } | undefined;
            hero?: any;
            styles?: {
                body?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                footer?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                header?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                hero?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
            } | undefined;
        }[];
    }>]>;
}, "strip", z.ZodTypeAny, {
    type: "flex";
    contents: {
        type: "bubble";
        size?: "nano" | "micro" | "deca" | "hecto" | "kilo" | "mega" | "giga" | undefined;
        direction?: "ltr" | "rtl" | undefined;
        body?: any;
        footer?: any;
        header?: any;
        action?: {
            type: "postback";
            data: string;
            label: string;
            displayText?: string | undefined;
            inputOption?: "closeRichMenu" | "openRichMenu" | "openKeyboard" | "openVoice" | undefined;
            fillInText?: string | undefined;
        } | {
            type: "message";
            label: string;
            text: string;
        } | {
            type: "uri";
            label: string;
            uri: string;
            altUri?: {
                desktop: string;
            } | undefined;
        } | {
            type: "datetimepicker";
            data: string;
            label: string;
            mode: "time" | "date" | "datetime";
            max?: string | undefined;
            min?: string | undefined;
            initial?: string | undefined;
        } | {
            type: "camera";
            label: string;
        } | {
            type: "cameraRoll";
            label: string;
        } | {
            type: "location";
            label: string;
        } | {
            type: "richmenuswitch";
            data: string;
            label: string;
            richMenuAliasId: string;
        } | {
            type: "clipboard";
            label: string;
            clipboardText: string;
        } | undefined;
        hero?: any;
        styles?: {
            body?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            footer?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            header?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            hero?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
        } | undefined;
    } | {
        type: "carousel";
        contents: {
            type: "bubble";
            size?: "nano" | "micro" | "deca" | "hecto" | "kilo" | "mega" | "giga" | undefined;
            direction?: "ltr" | "rtl" | undefined;
            body?: any;
            footer?: any;
            header?: any;
            action?: {
                type: "postback";
                data: string;
                label: string;
                displayText?: string | undefined;
                inputOption?: "closeRichMenu" | "openRichMenu" | "openKeyboard" | "openVoice" | undefined;
                fillInText?: string | undefined;
            } | {
                type: "message";
                label: string;
                text: string;
            } | {
                type: "uri";
                label: string;
                uri: string;
                altUri?: {
                    desktop: string;
                } | undefined;
            } | {
                type: "datetimepicker";
                data: string;
                label: string;
                mode: "time" | "date" | "datetime";
                max?: string | undefined;
                min?: string | undefined;
                initial?: string | undefined;
            } | {
                type: "camera";
                label: string;
            } | {
                type: "cameraRoll";
                label: string;
            } | {
                type: "location";
                label: string;
            } | {
                type: "richmenuswitch";
                data: string;
                label: string;
                richMenuAliasId: string;
            } | {
                type: "clipboard";
                label: string;
                clipboardText: string;
            } | undefined;
            hero?: any;
            styles?: {
                body?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                footer?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                header?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                hero?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
            } | undefined;
        }[];
    };
    altText: string;
}, {
    contents: {
        type: "bubble";
        size?: "nano" | "micro" | "deca" | "hecto" | "kilo" | "mega" | "giga" | undefined;
        direction?: "ltr" | "rtl" | undefined;
        body?: any;
        footer?: any;
        header?: any;
        action?: {
            type: "postback";
            data: string;
            label: string;
            displayText?: string | undefined;
            inputOption?: "closeRichMenu" | "openRichMenu" | "openKeyboard" | "openVoice" | undefined;
            fillInText?: string | undefined;
        } | {
            type: "message";
            label: string;
            text: string;
        } | {
            type: "uri";
            label: string;
            uri: string;
            altUri?: {
                desktop: string;
            } | undefined;
        } | {
            type: "datetimepicker";
            data: string;
            label: string;
            mode: "time" | "date" | "datetime";
            max?: string | undefined;
            min?: string | undefined;
            initial?: string | undefined;
        } | {
            type: "camera";
            label: string;
        } | {
            type: "cameraRoll";
            label: string;
        } | {
            type: "location";
            label: string;
        } | {
            type: "richmenuswitch";
            data: string;
            label: string;
            richMenuAliasId: string;
        } | {
            type: "clipboard";
            label: string;
            clipboardText: string;
        } | undefined;
        hero?: any;
        styles?: {
            body?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            footer?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            header?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
            hero?: {
                backgroundColor?: string | undefined;
                separator?: boolean | undefined;
                separatorColor?: string | undefined;
            } | undefined;
        } | undefined;
    } | {
        type: "carousel";
        contents: {
            type: "bubble";
            size?: "nano" | "micro" | "deca" | "hecto" | "kilo" | "mega" | "giga" | undefined;
            direction?: "ltr" | "rtl" | undefined;
            body?: any;
            footer?: any;
            header?: any;
            action?: {
                type: "postback";
                data: string;
                label: string;
                displayText?: string | undefined;
                inputOption?: "closeRichMenu" | "openRichMenu" | "openKeyboard" | "openVoice" | undefined;
                fillInText?: string | undefined;
            } | {
                type: "message";
                label: string;
                text: string;
            } | {
                type: "uri";
                label: string;
                uri: string;
                altUri?: {
                    desktop: string;
                } | undefined;
            } | {
                type: "datetimepicker";
                data: string;
                label: string;
                mode: "time" | "date" | "datetime";
                max?: string | undefined;
                min?: string | undefined;
                initial?: string | undefined;
            } | {
                type: "camera";
                label: string;
            } | {
                type: "cameraRoll";
                label: string;
            } | {
                type: "location";
                label: string;
            } | {
                type: "richmenuswitch";
                data: string;
                label: string;
                richMenuAliasId: string;
            } | {
                type: "clipboard";
                label: string;
                clipboardText: string;
            } | undefined;
            hero?: any;
            styles?: {
                body?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                footer?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                header?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
                hero?: {
                    backgroundColor?: string | undefined;
                    separator?: boolean | undefined;
                    separatorColor?: string | undefined;
                } | undefined;
            } | undefined;
        }[];
    };
    altText: string;
    type?: "flex" | undefined;
}>;
//# sourceMappingURL=flexMessage.d.ts.map