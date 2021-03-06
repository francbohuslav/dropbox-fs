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
exports.DropboxClient = void 0;
const fs = __importStar(require("fs"));
const util_1 = require("util");
const dropboxV2Api = require("dropbox-v2-api");
class DropboxClient {
    connect(token) {
        const dropbox = dropboxV2Api.authenticate({
            token,
        });
        this.clientRaw = dropbox;
        this.client = (0, util_1.promisify)(dropbox);
    }
    getUserInfo() {
        return this.client({
            resource: "users/get_current_account",
        });
    }
    readdir(folder) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    readFile(path, targetFile) {
        path = this.normalizeFilePath(path);
        console.log(`Dropbox: download file ${path} ...`);
        return new Promise((resolve, reject) => {
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
    }
    writeFile(targetFile, targetPath) {
        targetPath = this.normalizeFilePath(targetPath);
        console.log(`Dropbox: upload file ${targetPath} ...`);
        return new Promise((resolve, reject) => {
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
            fs.createReadStream(targetFile).pipe(uploadStream);
        });
    }
    normalizeFilePath(filePath) {
        return filePath.replace(/\\/g, "/");
    }
}
exports.DropboxClient = DropboxClient;
//# sourceMappingURL=dropbox-client.js.map