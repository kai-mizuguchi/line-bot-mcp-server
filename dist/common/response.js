export const createErrorResponse = (message) => {
    return {
        isError: true,
        content: [
            {
                type: "text",
                text: message,
            },
        ],
    };
};
export const createSuccessResponse = (response) => {
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(response),
            },
        ],
    };
};
//# sourceMappingURL=response.js.map