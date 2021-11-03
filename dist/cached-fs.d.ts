import { IRemoteFs } from "./i-remote-fs";
export declare class CachedFs {
    private remoteDir;
    private localDir;
    protected client: IRemoteFs;
    private cache;
    constructor(remoteFsClient: IRemoteFs, remoteDir: string, localDir: string);
    readFile(filePath: string): Promise<string>;
    writeFile(filePath: string, content: string): Promise<void>;
    readdir(dir: string): Promise<string[]>;
    fileExists(filePath: string): Promise<boolean>;
}
