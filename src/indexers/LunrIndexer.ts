import Lunr from "lunr";
import { fileExists, readFile, writeFile } from "fs-safe";
import { LibrarianCache } from "../cache/cache";
import { IndexableFileReference } from "../types/pdf-file-reference";
import { BaseIndexer } from "./BaseIndexer";

export class ElasticlunrIndexer
  implements BaseIndexer<IndexableFileReference<string>>
{
  static indexerType = "elasticlunr" as const;
  private lunrIndex: Lunr.Index;
  // private indexerQueue: IndexableFileReference<string>[] = [];
  // private indexerQueueExists: Set<string> = new Set();
  constructor(private cache: LibrarianCache, private indexPath: string) {
    const lunrIndex = Lunr(function (this) {
      this.ref("id");

      this.field("id");
      this.field("title");
      this.field("content");
      // TODO: add all items on initialization caur vanilla lunr doesn't support adding them dinamically, it seems :(
      //   this.
    });
    this.lunrIndex = lunrIndex;
  }
  async add(item: IndexableFileReference) {
    throw new Error("Method not implemented.");
    // this.indexerQueue.push(item);
  }
  async remove(id: string) {
    throw new Error("Method not implemented.");
    // this.lunrIndex.remove(id);
  }
  async put(id: string, item: IndexableFileReference) {
    if (this.exists(id)) this.remove(id);
    this.add(item);
  }
  async search(query: string): Promise<IndexableFileReference[]> {
    const results = this.lunrIndex.search(query);
    const fullDataResult = results.map((result) =>
      this.cache.getByHash(result.ref)
    );
    return Promise.all(fullDataResult);
  }
  async exists(id: string) {
    return this.lunrIndex.search(id).length > 0;
  }
  async serialize() {
    return JSON.stringify(this.lunrIndex);
  }
  async deserialize(indexJson: string) {
    this.lunrIndex = Lunr.Index.load(JSON.parse(indexJson));
  }
  async load() {
    if (await fileExists(this.indexPath)) {
      this.deserialize(await readFile(this.indexPath));
    }
  }
  async dump() {
    await writeFile(this.indexPath, await this.serialize());
  }
}
