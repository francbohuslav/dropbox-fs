import * as fs from "fs";
import { promisify } from "util";
import { FsError } from "./fs-error";
import { IRemoteFs } from "./i-remote-fs";

const dropboxV2Api = require("dropbox-v2-api");

export class DropboxFsClient implements IRemoteFs {
    private client: any;
    private clientRaw: any;

    public connect(token: string) {
        const dropbox = dropboxV2Api.authenticate({
            token,
        });
        this.clientRaw = dropbox;
        this.client = promisify(dropbox);
    }

    public getUserInfo(): Promise<any> {
        return this.client({
            resource: "users/get_current_account",
        });
    }

    public async readdir(folder: string): Promise<string[]> {
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
            throw new FsError(err.error_summary, "unknown");
        }
    }

    public readFile(path: string, targetFile: string): Promise<void> {
        path = this.normalizeFilePath(path);
        console.log(`Dropbox: download file ${path} ...`);
        return new Promise((resolve, reject) => {
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

    public writeFile(targetFile: string, targetPath: string): Promise<void> {
        targetPath = this.normalizeFilePath(targetPath);
        console.log(`Dropbox: upload file ${targetPath} ...`);
        return new Promise((resolve, reject) => {
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
            fs.createReadStream(targetFile).pipe(uploadStream);
        });
    }

    private normalizeFilePath(filePath: string): string {
        return filePath.replace(/\\/g, "/");
    }
}
