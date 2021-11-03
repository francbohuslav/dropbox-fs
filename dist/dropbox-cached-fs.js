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
exports.DropboxCachedFs = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fsp = fs.promises;
class DropboxCachedFs {
    constructor(remoteFsClient, remoteDir, localDir) {
        this.remoteDir = remoteDir;
        this.localDir = localDir;
        this.client = null;
        this.cache = {};
        if (remoteFsClient) {
            this.client = remoteFsClient;
        }
        else {
            console.log("Dropbox token not specified, only local filesystem is used");
        }
        fs.mkdirSync(localDir, { recursive: true });
    }
    setDropboxClient(client) {
        this.client = client;
    }
    readFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const localFilePath = path.join(this.localDir, filePath);
            fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
            if (this.client && !fs.existsSync(localFilePath)) {
                const remoteFilePath = path.join(this.remoteDir, filePath);
                yield this.client.readFile(remoteFilePath, localFilePath);
            }
            return fsp.readFile(localFilePath, { encoding: "utf-8" });
        });
    }
    writeFile(filePath, content) {
        return __awaiter(this, void 0, void 0, function* () {
            const localFilePath = path.join(this.localDir, filePath);
            fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
            yield fsp.writeFile(localFilePath, content, { encoding: "utf-8" });
            if (this.client) {
                const remoteFilePath = path.join(this.remoteDir, filePath);
                yield this.client.writeFile(localFilePath, remoteFilePath);
                const remotedir = path.dirname(remoteFilePath);
                console.log(`Invalidate cache ${remotedir}`);
                delete this.cache[remotedir];
            }
        });
    }
    readdir(dir) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.client) {
                const remoteFilePath = path.join(this.remoteDir, dir);
                if (this.cache[remoteFilePath]) {
                    console.log(`From cache ${remoteFilePath}`);
                    return this.cache[remoteFilePath];
                }
                try {
                    const files = yield this.client.readdir(remoteFilePath);
                    this.cache[remoteFilePath] = files;
                    return files;
                }
                catch (err) {
                    if ((err.error_summary + "").startsWith("path/not_found")) {
                        this.cache[remoteFilePath] = [];
                        return [];
                    }
                    throw err;
                }
            }
            else {
                const localFilePath = path.join(this.localDir, dir);
                return yield fsp.readdir(localFilePath);
            }
        });
    }
    fileExists(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const localFilePath = path.join(this.localDir, filePath);
            if (fs.existsSync(localFilePath)) {
                return true;
            }
            const files = yield this.readdir(path.dirname(filePath));
            return files.includes(path.basename(filePath));
        });
    }
}
exports.DropboxCachedFs = DropboxCachedFs;
//# sourceMappingURL=dropbox-cached-fs.js.map