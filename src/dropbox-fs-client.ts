import * as fs from "fs";
import { promisify } from "util";
import { FsError } from "./fs-error";
import { IRemoteFs } from "./i-remote-fs";

const dropboxV2Api = require("dropbox-v2-api");

export class DropboxFsClient implements IRemoteFs {
    private client: any;
    private clientRaw: any;
    private refreshToken: string;
    private tokenExpiresTimestamp: number = 0;

    public init(appKey: string, appSecret: string, redirectUri: string) {
        const dropbox = dropboxV2Api.authenticate({
            client_id: appKey,
            client_secret: appSecret,
            token_access_type: "offline",
            redirect_uri: redirectUri,
        });
        this.clientRaw = dropbox;
        this.client = promisify(dropbox);
    }

    public generateAuthUrl(): string {
        const url = this.clientRaw.generateAuthUrl();
        console.log("Dropbox: auth URL", url);
        return url;
    }

    public async getRefreshToken(authCode: string): Promise<string> {
        const response = await promisify(this.clientRaw.getToken)(authCode);
        await promisify(this.clientRaw.refreshToken)(response.refresh_token);
        console.log("Dropbox: refresh token", response.refresh_token);
        return response.refresh_token;
    }

    public setRefreshToken(refreshToken: string): void {
        this.refreshToken = refreshToken;
    }

    public async getUserInfo(): Promise<any> {
        await this.refreshTokenIfNeeded();
        return await this.client({
            resource: "users/get_current_account",
        });
    }

    public async readdir(folder: string): Promise<string[]> {
        await this.refreshTokenIfNeeded();
        try {
            folder = this.normalizeFilePath(folder);
            console.log(`Dropbox: list files ${folder} ...`);
            let response: any;
            const files: string[] = [];
            response = await this.client({
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
            response.entries.forEach((e: any) => files.push(e.name));
            while (response.hasMore) {
                response = await this.client({
                    resource: "files/list_folder",
                    parameters: {
                        cursor: response.cursor,
                    },
                });
                response.entries.forEach((e: any) => files.push(e.name));
            }
            console.log(`Dropbox: ... ${files.length} files`);
            return files;
        } catch (err) {
            if ((err.error_summary + "").startsWith("path/not_found")) {
                throw new FsError("Path not dound", "path-not-found", err);
            }
            throw new FsError(err.error_summary || err, "unknown");
        }
    }

    public async readFile(path: string, targetFile: string): Promise<void> {
        await this.refreshTokenIfNeeded();
        path = this.normalizeFilePath(path);
        console.log(`Dropbox: download file ${path} ...`);
        return await new Promise((resolve, reject) => {
            const stream = this.clientRaw(
                {
                    resource: "files/download",
                    parameters: {
                        path,
                    },
                },
                (err: any) => {
                    if (err) {
                        console.log(`Dropbox ERROR: ` + err);
                        reject(err);
                    }
                }
            ).pipe(fs.createWriteStream(targetFile));
            stream.on("finish", () => {
                console.log(`Dropbox: ... done`);
                resolve();
            });
        });
    }

    public async writeFile(sourceFile: string, targetPath: string): Promise<void> {
        await this.refreshTokenIfNeeded();
        targetPath = this.normalizeFilePath(targetPath);
        console.log(`Dropbox: upload file ${targetPath} ...`);
        return await new Promise((resolve, reject) => {
            const uploadStream = this.clientRaw(
                {
                    resource: "files/upload",
                    parameters: {
                        path: targetPath,
                        mode: "overwrite",
                    },
                },
                (err: any) => {
                    if (err) {
                        console.log(`Dropbox ERROR: ` + err);
                        reject(err);
                    } else {
                        console.log(`Dropbox: ... done`);
                        resolve();
                    }
                }
            );
            fs.createReadStream(sourceFile).pipe(uploadStream);
        });
    }

    public async unlinkFile(targetPath: string): Promise<void> {
        await this.refreshTokenIfNeeded();
        targetPath = this.normalizeFilePath(targetPath);
        console.log(`Dropbox: unlink file ${targetPath} ...`);
        return await this.client({
            resource: "files/delete",
            parameters: {
                path: targetPath,
            },
        });
    }

    private normalizeFilePath(filePath: string): string {
        return filePath.replace(/\\/g, "/");
    }

    private async refreshTokenIfNeeded() {
        if (new Date().getTime() > this.tokenExpiresTimestamp) {
            const res = await promisify(this.clientRaw.refreshToken)(this.refreshToken);
            this.tokenExpiresTimestamp = new Date().getTime() + (res.expires_in - 60 * 10) * 1000;
            console.log("Dropbox: token expires in", new Date(this.tokenExpiresTimestamp).toISOString());
        }
    }
}
