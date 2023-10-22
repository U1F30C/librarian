import { Database, open } from "sqlite";
import sqlite3 from "sqlite3";
import { PdfFileReference } from "../types/pdf-file-reference";

interface FileDBModel {
  id: number;
  filePath: string;
  fileHash: string;
  textContent: string;
}

// filePath is used to quickly check if the file has been read
// fileHash is used to check if the file has been renamed, it is seen as the true unique identifier
export class LibrarianCache {
  db: Database<sqlite3.Database, sqlite3.Statement>;

  constructor(private cachePath: string) {}
  async load() {
    const db = await open({
      filename: this.cachePath,
      driver: sqlite3.Database,
    });

    // create sqlite table with id, filePath and textContent
    await db.exec(`CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY,
      filePath TEXT NOT NULL,
      fileHash TEXT NOT NULL,
      textContent TEXT NOT NULL
    )`);

    await db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS fileHashIndex ON files (fileHash)`
    );
    await db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS filePathIndex ON files (filePath)`
    );
    this.db = db;
  }

  async unload() {
    await this.db.close();
  }

  async getByPath(key: string): Promise<PdfFileReference> {
    const query = `SELECT * FROM files WHERE filePath = ?`;
    const result = await this.db.get<FileDBModel>(query, key);
    if (!result) return null;
    return {
      id: result.fileHash,
      title: result.filePath,
      content: result.textContent,
    };
  }

  async getByHash(hash: string, path: string): Promise<PdfFileReference> {
    const query = `SELECT * FROM files WHERE fileHash = ?`;
    const result = await this.db.get<FileDBModel>(query, hash);
    if (result && result.filePath !== path) {
      await this.db.run(
        `UPDATE files SET filePath = ? WHERE fileHash = ?`,
        path,
        hash
      );
    }
    if (!result) return null;
    return {
      id: result.fileHash,
      title: result.filePath,
      content: result.textContent,
    };
  }

  async set(path: string, hash: string, value: PdfFileReference<string>) {
    const query = `INSERT INTO files (filePath, fileHash, textContent) VALUES (?, ?, ?)`;
    await this.db.run(query, path, hash, value.content);
  }

  async unsetByPath(path: string) {
    const query = `DELETE FROM files WHERE filePath = ?`;
    await this.db.run(query, path);
  }

  unsetByHash(hash: string) {
    const query = `DELETE FROM files WHERE fileHash = ?`;
    this.db.run(query, hash);
  }

  getCacheStore() {
    return this.db;
  }

  async getGhostKeys(actualKeys: string[]) {
    return await this.db.all(
      `SELECT * FROM files WHERE filePath NOT IN (?)`,
      actualKeys
    );
  }
}
