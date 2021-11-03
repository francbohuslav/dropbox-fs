export class FsError extends Error {
    constructor(message: string, public code: string, public innerError?: any) {
        super(message);
    }
}
