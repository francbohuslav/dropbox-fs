import * as fs from "fs";
import { join } from "path";
import { CachedFs } from "../src/cached-fs";
import { DropboxFsClient } from "../src/dropbox-fs-client";
import { FsError } from "../src/fs-error";
import { IRemoteFs } from "../src/i-remote-fs";
const fsp = fs.promises;

const localDataStorage = join(__dirname, "data");
async function deleteTestedFiles() {
    for (const file of await fsp.readdir(localDataStorage)) {
        if (file.endsWith(".txt")) {
            await fsp.unlink(join(localDataStorage, file));
        }
    }
}

test("local file read, write, readdir, delete", async () => {
    await deleteTestedFiles();
    const fs = new CachedFs(null, null, localDataStorage);
    const expectedContent = "some content řščřščšč";
    await fs.writeFile("test.txt", expectedContent);
    const content = await fs.readFile("test.txt");
    expect(content).toEqual(expectedContent);
    // readdir
    let files = await fs.readdir(".");
    expect(files).toEqual([".gitkeep", "test.txt"]);
    // delete
    await fs.unlinkFile("test.txt");
    files = await fs.readdir(".");
    expect(files).toEqual([".gitkeep"]);
});

test("file exists", async () => {
    await deleteTestedFiles();
    const fs = new CachedFs(null, null, localDataStorage);
    expect(await fs.fileExists("neexistuje.txt")).toBe(false);
    expect(await fs.fileExists(".gitkeep")).toBe(true);
});

test("mocked remote", async () => {
    await deleteTestedFiles();
    const client = new MockedMemoryClient();
    const fs = new CachedFs(client, "remoteStorage", localDataStorage);

    // write and read custom file
    const expectedContent = "some content řščřščšč";
    await fs.writeFile("test.txt", expectedContent);
    const content = await fs.readFile("test.txt");
    expect(content).toEqual(expectedContent);

    // read dir twice (for cache)
    let files = await fs.readdir(".");
    expect(files).toEqual(["alreadyExisted.txt", "test.txt"]);
    files = await fs.readdir(".");
    expect(files).toEqual(["alreadyExisted.txt", "test.txt"]);

    // read remote
    expect(await fs.readFile("alreadyExisted.txt")).toEqual("some content");

    // file not found
    try {
        await fs.readFile("not-exists.txt");
        fail("Error not thrown");
    } catch (err) {
        console.log(err.message, err.code);
        expect(err.message).toContain("not found");
        expect(err.code).toBe("path-not-found");
    }
    // dir not found
    files = await fs.readdir("not-exists");
    expect(files).toEqual([]);
});

test.skip("real dropbox", async () => {
    await deleteTestedFiles();
    const client = new DropboxFsClient();
    const authCode = ""; // Run this test repeatedly and follow steps to set this
    const refreshToken = ""; // Run this test repeatedly and follow steps to set this

    client.init("", "", "http://localhost:4000/auth");
    if (refreshToken) {
        await client.setRefreshToken(refreshToken);
    } else if (authCode) {
        await client.getRefreshToken(authCode);
    } else {
        client.generateAuthUrl();
    }

    const fs = new CachedFs(client, "/not-existed-storage", localDataStorage);
    const files = await fs.readdir("not-exists");
    expect(files).toEqual([]);
});

class MockedMemoryClient implements IRemoteFs {
    public files: { [path: string]: string } = {
        "remoteStorage\\alreadyExisted.txt": "some content",
    };

    public async readdir(folder: string): Promise<string[]> {
        const files: string[] = [];
        for (const file of Object.keys(this.files)) {
            if (file.startsWith(folder)) {
                files.push(file.slice(folder.length + 1));
            }
        }
        if (files.length == 0) {
            throw new FsError("path not found", "path-not-found");
        }
        return files;
    }

    public async readFile(path: string, targetFile: string): Promise<void> {
        if (!this.files[path]) {
            throw new FsError("path not found", "path-not-found");
        }
        await fsp.writeFile(targetFile, this.files[path], { encoding: "utf-8" });
    }

    public async writeFile(targetFile: string, targetPath: string): Promise<void> {
        this.files[targetPath] = await fsp.readFile(targetFile, { encoding: "utf-8" });
    }

    public async unlinkFile(remoteFilePath: string): Promise<void> {
        delete this.files[remoteFilePath];
    }
}
