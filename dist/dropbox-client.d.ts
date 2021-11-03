import { IRemoteFs } from "./i-remote-fs";
export declare class DropboxClient implements IRemoteFs {
    private client;
    private clientRaw;
    connect(token: string): void;
    getUserInfo(): Promise<any>;
    readdir(folder: string): Promise<string[]>;
    readFile(path: string, targetFile: string): Promise<void>;
    writeFile(targetFile: string, targetPath: string): Promise<void>;
    private normalizeFilePath;
}
