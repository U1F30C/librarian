import { Database, open } from "sqlite";
import sqlite3 from "sqlite3";
import { IndexableFileReference } from "../types/pdf-file-reference";
import { rawLinesToPlainText } from "../utils/raw-lines-to-plain-text";
import { readPdfText as _readPdfText } from "pdf-text-reader"
interface FileDBModel {
  id: number;
  path: string;
  hash: string;
  mimeType: string;
  textContent: string;
}

export function cacheToIndexableFileReference(cache: FileDBModel): IndexableFileReference<string> {
  let plainTextContent: string;
  if(cache.mimeType === "application/pdf") {
    plainTextContent = rawLinesToPlainText(JSON.parse(cache.textContent));
  }
  else {
    plainTextContent = cache.textContent;
  }
  return {
    id: cache.hash,
    title: cache.path,
    content: plainTextContent,
  };
}


async function readPdfText(data: Buffer) {
  const pages = await _readPdfText(data);
  return pages;
}

export async function indexableFileReferenceToCache(cache: IndexableFileReference<Buffer>, type: string): Promise<Omit<FileDBModel, "id">> {
  let textSerializedContent: string;
  if(type === "application/pdf") {
    textSerializedContent = await readPdfText(cache.content).then(JSON.stringify);
  }
  else {
    textSerializedContent = cache.content.toString();
  }
  return {
    path: cache.title,
    hash: cache.id,
    mimeType: type,
    textContent: textSerializedContent,
  };
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
      mimeType TEXT NOT NULL,
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

  async getByPath(key: string): Promise<IndexableFileReference> {
    const query = `SELECT * FROM files WHERE path = ?`;
    const result = await this.db.get<FileDBModel>(query, key);
    if (!result) return null;
    return cacheToIndexableFileReference(result);
  }

  async getByHash(hash: string, path?: string): Promise<IndexableFileReference> {
    const query = `SELECT * FROM files WHERE hash = ?`;
    const result = await this.db.get<FileDBModel>(query, hash);
    if (result && path && result.path !== path) {
      await this.db.run(
        `UPDATE files SET path = ? WHERE hash = ?`,
        path,
        hash
      );
    }
    if (!result) return null;
    return cacheToIndexableFileReference(result);
  }

  async set(value: IndexableFileReference<Buffer>, mimeType: string) {
    const query = `INSERT INTO files (path, hash, textContent, mimeType) VALUES (?, ?, ?, ?)`;
    const fileRefToInsert = await indexableFileReferenceToCache(value, mimeType);
    await this.db.run(query, fileRefToInsert.path, fileRefToInsert.hash, fileRefToInsert.textContent, mimeType);
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
