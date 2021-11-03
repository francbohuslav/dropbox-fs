import { DropboxClient } from "./dropbox-client";
import { IRemoteFs } from "./i-remote-fs";
export declare class DropboxCachedFs {
    private remoteDir;
    private localDir;
    protected client: IRemoteFs;
    private cache;
    constructor(remoteFsClient: IRemoteFs, remoteDir: string, localDir: string);
    setDropboxClient(client: DropboxClient): void;
    readFile(filePath: string): Promise<string>;
    writeFile(filePath: string, content: string): Promise<void>;
    readdir(dir: string): Promise<string[]>;
    fileExists(filePath: string): Promise<boolean>;
}
