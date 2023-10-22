import { Database, open } from "sqlite";
import sqlite3 from "sqlite3";
import { PdfFileReference } from "../types/pdf-file-reference";

interface FileDBModel {
  id: number;
  path: string;
  hash: string;
  textContent: string;
}

// file path is used to quickly check if the file has been read
// file hash is used to check if the file has been renamed, it is seen as the true unique identifier
export class LibrarianCache {
  db: Database<sqlite3.Database, sqlite3.Statement>;

  constructor(private cachePath: string) {}
  async load() {
    const db = await open({
      filename: this.cachePath,
      driver: sqlite3.Database,
    });

    // create sqlite table with id, path and textContent
    await db.exec(`CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY,
      path TEXT NOT NULL,
      hash TEXT NOT NULL,
      textContent TEXT NOT NULL
    )`);

    await db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS hashIndex ON files (hash)`
    );
    await db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS pathIndex ON files (path)`
    );
    this.db = db;
  }

  async unload() {
    await this.db.close();
  }

  async getByPath(key: string): Promise<PdfFileReference> {
    const query = `SELECT * FROM files WHERE path = ?`;
    const result = await this.db.get<FileDBModel>(query, key);
    if (!result) return null;
    return {
      id: result.hash,
      title: result.path,
      content: result.textContent,
    };
  }

  async getByHash(hash: string, path: string): Promise<PdfFileReference> {
    const query = `SELECT * FROM files WHERE hash = ?`;
    const result = await this.db.get<FileDBModel>(query, hash);
    if (result && result.path !== path) {
      await this.db.run(
        `UPDATE files SET path = ? WHERE hash = ?`,
        path,
        hash
      );
    }
    if (!result) return null;
    return {
      id: result.hash,
      title: result.path,
      content: result.textContent,
    };
  }

  async set(path: string, hash: string, value: PdfFileReference<string>) {
    const query = `INSERT INTO files (path, hash, textContent) VALUES (?, ?, ?)`;
    await this.db.run(query, path, hash, value.content);
  }

  async unsetByPath(path: string) {
    const query = `DELETE FROM files WHERE path = ?`;
    await this.db.run(query, path);
  }

  unsetByHash(hash: string) {
    const query = `DELETE FROM files WHERE hash = ?`;
    this.db.run(query, hash);
  }

  getCacheStore() {
    return this.db;
  }

  async getGhostKeys(actualKeys: string[]) {
    return await this.db.all(
      `SELECT * FROM files WHERE path NOT IN (?)`,
      actualKeys
    );
  }
}
