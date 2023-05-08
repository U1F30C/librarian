import { Page } from "pdf-text-reader";
import { PdfFileReference } from "../types/pdf-file-reference";
import { fileExists, readJSON, writeJSON } from "fs-safe";

export interface CacheData {
  [key: string]: PdfFileReference<Page[]> | undefined;
}

export class LibrarianCache {
  private cache: CacheData = {};
  constructor(private cachePath: string) {}
  async load() {
    let cache: CacheData;
    if (await fileExists(this.cachePath)) {
      cache = (await readJSON(this.cachePath)) as any;
    } else {
      cache = {};
    }
    this.cache = cache;
  }
  async dump() {
    return writeJSON(this.cachePath, this.cache as any, { pretty: false });
  }
  get(key: string) {
    return this.cache[key];
  }
  set(key: string, value: PdfFileReference<Page[]>) {
    this.cache[key] = value;
  }
  getCacheStore() {
    return this.cache;
  }
  getGhostKeys(actualKeys: string[]) {
    const actualKeysMap = actualKeys.reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as { [key: string]: boolean });
    const currentKeys = Object.keys(this.cache);
    const ghostKeys = [];
    for (const key of currentKeys) {
      if (!actualKeysMap[key]) {
        ghostKeys.push(key);
      }
    }
  }
}
