import { fileExists, readFile, writeFile } from "fs-safe";
import Minisearch from "minisearch";
import { LibrarianCache } from "../cache/cache";
import { IndexableFileReference } from "../types/pdf-file-reference";
import { BaseIndexer } from "./BaseIndexer";

export class MinisearchIndexer
  implements BaseIndexer<IndexableFileReference<string>>
{
  static indexerType = "minisearch";
  private minisearchEngine: Minisearch;
  private config = {
    fields: ["title", "content"],
    storeFields: ["title", "content"],
  };
  constructor(private cache: LibrarianCache, private indexPath: string) {
    const minisearchEngine = new Minisearch(this.config);
    this.minisearchEngine = minisearchEngine;
  }
  add(item: IndexableFileReference): void {
    if (!this.exists(item.id)) this.minisearchEngine.add(item);
  }
  remove(id: string): void {
    this.minisearchEngine.remove({ id });
  }
  put(id: string, item: IndexableFileReference): void {
    if (this.exists(id)) this.remove(id);
    this.add(item);
  }
  search(query: string): Promise<IndexableFileReference[]> {
    const results = this.minisearchEngine.search(query, {
      prefix: true,
      fuzzy: 0.2,
    });
    const fullDataResult = results.map((result) =>
      this.cache.getByHash(result.id)
    );
    return Promise.all(fullDataResult);
  }
  exists(id: string): boolean {
    return this.minisearchEngine.has(id);
  }
  serialize(): string {
    return JSON.stringify(this.minisearchEngine);
  }
  deserialize(indexJson: string) {
    this.minisearchEngine = Minisearch.loadJSON(indexJson, this.config);
  }
  async load() {
    if (await fileExists(this.indexPath)) {
      this.deserialize(await readFile(this.indexPath));
    }
  }
  async dump() {
    await writeFile(this.indexPath, this.serialize());
  }
}
