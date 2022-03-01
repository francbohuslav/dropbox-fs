import { IRemoteFs } from "./i-remote-fs";
export declare class DropboxFsClient implements IRemoteFs {
    private client;
    private clientRaw;
    connect(token: string): void;
    getUserInfo(): Promise<any>;
    readdir(folder: string): Promise<string[]>;
    readFile(path: string, targetFile: string): Promise<void>;
    writeFile(sourceFile: string, targetPath: string): Promise<void>;
    unlinkFile(targetPath: string): Promise<void>;
    private normalizeFilePath;
}
