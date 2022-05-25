"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DropboxFsClient = void 0;
const fs = __importStar(require("fs"));
const util_1 = require("util");
const fs_error_1 = require("./fs-error");
const dropboxV2Api = require("dropbox-v2-api");
class DropboxFsClient {
    constructor() {
        this.tokenExpiresTimestamp = 0;
    }
    init(appKey, appSecret, redirectUri) {
        const dropbox = dropboxV2Api.authenticate({
            client_id: appKey,
            client_secret: appSecret,
            token_access_type: "offline",
            redirect_uri: redirectUri,
        });
        this.clientRaw = dropbox;
        this.client = (0, util_1.promisify)(dropbox);
    }
    generateAuthUrl() {
        const url = this.clientRaw.generateAuthUrl();
        console.log("Dropbox: auth URL", url);
        return url;
    }
    getRefreshToken(authCode) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield (0, util_1.promisify)(this.clientRaw.getToken)(authCode);
            yield (0, util_1.promisify)(this.clientRaw.refreshToken)(response.refresh_token);
            console.log("Dropbox: refresh token", response.refresh_token);
            return response.refresh_token;
        });
    }
    setRefreshToken(refreshToken) {
        this.refreshToken = refreshToken;
    }
    getUserInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.refreshTokenIfNeeded();
            return yield this.client({
                resource: "users/get_current_account",
            });
        });
    }
    readdir(folder) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.refreshTokenIfNeeded();
            try {
                folder = this.normalizeFilePath(folder);
                console.log(`Dropbox: list files ${folder} ...`);
                let response;
                const files = [];
                response = yield this.client({
                    resource: "files/list_folder",
                    parameters: {
                        path: folder,
                        recursive: false,
                        include_media_info: false,
                        include_deleted: false,
                        include_has_explicit_shared_members: false,
                        include_mounted_folders: true,
                        include_non_downloadable_files: true,
                    },
                });
                response.entries.forEach((e) => files.push(e.name));
                while (response.hasMore) {
                    response = yield this.client({
                        resource: "files/list_folder",
                        parameters: {
                            cursor: response.cursor,
                        },
                    });
                    response.entries.forEach((e) => files.push(e.name));
                }
                console.log(`Dropbox: ... ${files.length} files`);
                return files;
            }
            catch (err) {
                if ((err.error_summary + "").startsWith("path/not_found")) {
                    throw new fs_error_1.FsError("Path not dound", "path-not-found", err);
                }
                throw new fs_error_1.FsError(err.error_summary || err, "unknown");
            }
        });
    }
    readFile(path, targetFile) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.refreshTokenIfNeeded();
            path = this.normalizeFilePath(path);
            console.log(`Dropbox: download file ${path} ...`);
            return yield new Promise((resolve, reject) => {
                const stream = this.clientRaw({
                    resource: "files/download",
                    parameters: {
                        path,
                    },
                }, (err) => {
                    if (err) {
                        console.log(`Dropbox ERROR: ` + err);
                        reject(err);
                    }
                }).pipe(fs.createWriteStream(targetFile));
                stream.on("finish", () => {
                    console.log(`Dropbox: ... done`);
                    resolve();
                });
            });
        });
    }
    writeFile(sourceFile, targetPath) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.refreshTokenIfNeeded();
            targetPath = this.normalizeFilePath(targetPath);
            console.log(`Dropbox: upload file ${targetPath} ...`);
            return yield new Promise((resolve, reject) => {
                const uploadStream = this.clientRaw({
                    resource: "files/upload",
                    parameters: {
                        path: targetPath,
                        mode: "overwrite",
                    },
                }, (err) => {
                    if (err) {
                        console.log(`Dropbox ERROR: ` + err);
                        reject(err);
                    }
                    else {
                        console.log(`Dropbox: ... done`);
                        resolve();
                    }
                });
                fs.createReadStream(sourceFile).pipe(uploadStream);
            });
        });
    }
    unlinkFile(targetPath) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.refreshTokenIfNeeded();
            targetPath = this.normalizeFilePath(targetPath);
            console.log(`Dropbox: unlink file ${targetPath} ...`);
            return yield this.client({
                resource: "files/delete",
                parameters: {
                    path: targetPath,
                },
            });
        });
    }
    normalizeFilePath(filePath) {
        return filePath.replace(/\\/g, "/");
    }
    refreshTokenIfNeeded() {
        return __awaiter(this, void 0, void 0, function* () {
            if (new Date().getTime() > this.tokenExpiresTimestamp) {
                const res = yield (0, util_1.promisify)(this.clientRaw.refreshToken)(this.refreshToken);
                this.tokenExpiresTimestamp = new Date().getTime() + (res.expires_in - 60 * 10) * 1000;
                console.log("Dropbox: token expires in", new Date(this.tokenExpiresTimestamp).toISOString());
            }
        });
    }
}
exports.DropboxFsClient = DropboxFsClient;
//# sourceMappingURL=dropbox-fs-client.js.map