import { fileExists, readFile, writeFile } from "fs-safe";
import Minisearch from "minisearch";
import { LibrarianCache } from "../cache/cache";
import { IndexableFileReference } from "../types/pdf-file-reference";
import { BaseIndexer } from "./BaseIndexer";
import { JSONSerializer } from "../utils/json-serializers";

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
  async add(item: IndexableFileReference) {
    if (!this.exists(item.id)) this.minisearchEngine.add(item);
  }
  async remove(id: string) {
    this.minisearchEngine.remove({ id });
  }
  async put(id: string, item: IndexableFileReference){
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
  async exists(id: string){
    return this.minisearchEngine.has(id);
  }
  async serialize(): Promise<Buffer | string> { 
    return JSONSerializer.serialize(this.minisearchEngine.toJSON());
  }
  async deserialize(indexJson: Buffer) {
    const deserializedData = await JSONSerializer.deserialize(indexJson);
    this.minisearchEngine = Minisearch.loadJS(deserializedData, this.config);
  }
  async load() {
    if (await fileExists(this.indexPath)) {
      await this.deserialize(await readFile(this.indexPath, {buffer: true}));
    }
  }
  async dump() {
    await writeFile(this.indexPath, await this.serialize());
  }
}
