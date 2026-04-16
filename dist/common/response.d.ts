export declare const createErrorResponse: (message: string) => {
    isError: boolean;
    content: {
        type: "text";
        text: string;
    }[];
};
export declare const createSuccessResponse: (response: object) => {
    content: {
        type: "text";
        text: string;
    }[];
};
//# sourceMappingURL=response.d.ts.map