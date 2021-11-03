import * as fs from "fs";
import * as path from "path";
import { FsError } from "./fs-error";
import { IRemoteFs } from "./i-remote-fs";
const fsp = fs.promises;

export class CachedFs {
    protected client: IRemoteFs = null;
    private cache: { [directory: string]: string[] } = {};

    constructor(remoteFsClient: IRemoteFs, private remoteDir: string, private localDir: string) {
        if (remoteFsClient) {
            this.client = remoteFsClient;
        } else {
            console.log("Dropbox token not specified, only local filesystem is used");
        }
        fs.mkdirSync(localDir, { recursive: true });
    }

    public async readFile(filePath: string): Promise<string> {
        const localFilePath = path.join(this.localDir, filePath);
        fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
        if (this.client && !fs.existsSync(localFilePath)) {
            const remoteFilePath = path.join(this.remoteDir, filePath);
            await this.client.readFile(remoteFilePath, localFilePath);
        }
        return fsp.readFile(localFilePath, { encoding: "utf-8" });
    }

    public async writeFile(filePath: string, content: string): Promise<void> {
        const localFilePath = path.join(this.localDir, filePath);
        fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
        await fsp.writeFile(localFilePath, content, { encoding: "utf-8" });
        if (this.client) {
            const remoteFilePath = path.join(this.remoteDir, filePath);
            await this.client.writeFile(localFilePath, remoteFilePath);
            const remotedir = path.dirname(remoteFilePath);
            console.log(`Invalidate cache ${remotedir}`);
            delete this.cache[remotedir];
        }
    }

    public async readdir(dir: string): Promise<string[]> {
        if (this.client) {
            const remoteFilePath = path.join(this.remoteDir, dir);
            if (this.cache[remoteFilePath]) {
                console.log(`From cache ${remoteFilePath}`);
                return this.cache[remoteFilePath];
            }
            try {
                const files = await this.client.readdir(remoteFilePath);
                this.cache[remoteFilePath] = files;
                return files;
            } catch (err) {
                if (err instanceof FsError) {
                    if (err.code == "path-not-found") {
                        this.cache[remoteFilePath] = [];
                        return [];
                    }
                }
                throw err;
            }
        } else {
            const localFilePath = path.join(this.localDir, dir);
            return await fsp.readdir(localFilePath);
        }
    }

    public async fileExists(filePath: string): Promise<boolean> {
        const localFilePath = path.join(this.localDir, filePath);
        if (fs.existsSync(localFilePath)) {
            return true;
        }
        const files = await this.readdir(path.dirname(filePath));
        return files.includes(path.basename(filePath));
    }
}
