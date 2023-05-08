import { fileExists, readFile, writeFile } from "fs-safe";
import Minisearch from "minisearch";
import { LibrarianCache } from "../cache/cache";
import { PdfFileReference } from "../types/pdf-file-reference";
import { BaseIndexer } from "./BaseIndexer";

export class MinisearchIndexer
  implements BaseIndexer<PdfFileReference<string>>
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
  add(item: PdfFileReference): void {
    // console.log("    add", MinisearchIndexer.indexerType, item.id);

    if (!this.exists(item.id)) this.minisearchEngine.add(item);
  }
  remove(id: string): void {
    // console.log("    remove", MinisearchIndexer.indexerType, id);
    this.minisearchEngine.remove({ id });
  }
  put(id: string, item: PdfFileReference): void {
    // console.log("    put", MinisearchIndexer.indexerType, id);
    if (this.exists(id)) this.remove(id);
    this.add(item);
  }
  search(query: string): PdfFileReference[] {
    const results = this.minisearchEngine.search(query, {
      prefix: true,
      fuzzy: 0.2,
    });
    return results.map((result) => this.cache.get(result.id));
  }
  exists(id: string): boolean {
    const result = this.minisearchEngine.has(id);
    console.log("    exists", MinisearchIndexer.indexerType, result);
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
    console.log("    dump", MinisearchIndexer.indexerType);
    // console.log(
    //   "    exists Brent_GBC.pdf",
    //   MinisearchIndexer.indexerType,
    //   this.exists("Brent_GBC.pdf")
    // );
    await writeFile(this.indexPath, this.serialize());
  }
}
