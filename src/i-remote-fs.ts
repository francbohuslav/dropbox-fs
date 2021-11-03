export interface IRemoteFs {
    readdir(remoteFilePath: string): Promise<string[]>;
    writeFile(localFilePath: string, remoteFilePath: string): Promise<void>;
    readFile(remoteFilePath: string, localFilePath: string): Promise<void>;
}
