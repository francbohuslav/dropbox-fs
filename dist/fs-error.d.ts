export declare class FsError extends Error {
    code: string;
    innerError?: any;
    constructor(message: string, code: string, innerError?: any);
}
