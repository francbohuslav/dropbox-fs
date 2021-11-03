"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FsError = void 0;
class FsError extends Error {
    constructor(message, code, innerError) {
        super(message);
        this.code = code;
        this.innerError = innerError;
    }
}
exports.FsError = FsError;
//# sourceMappingURL=fs-error.js.map