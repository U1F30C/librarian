import Elasticlunr from "elasticlunr";
import { fileExists, readFile, writeFile } from "fs-safe";
import { LibrarianCache } from "../cache/cache";
import { IndexableFileReference } from "../types/pdf-file-reference";
import { BaseIndexer } from "./BaseIndexer";

export class ElasticlunrIndexer
  implements BaseIndexer<IndexableFileReference<string>>
{
  static indexerType = "elasticlunr" as const;
  private elasticlunrIndex: Elasticlunr.Index<IndexableFileReference>;
  constructor(private cache: LibrarianCache, private indexPath: string) {
    const elasticlunrIndex = Elasticlunr<IndexableFileReference>(function (
      this
    ) {
      this.setRef("id");

      this.addField("title");
      this.addField("content");
      this.saveDocument(false);
    });
    this.elasticlunrIndex = elasticlunrIndex;
  }
  async add(item: IndexableFileReference) {
    if (!this.exists(item.id)) this.elasticlunrIndex.addDoc(item);
  }
  async remove(id: string) {
    this.elasticlunrIndex.removeDocByRef(id);
  }
  async put(id: string, item: IndexableFileReference) {
    if (this.exists(id)) this.remove(id);
    this.add(item);
  }
  search(query: string): Promise<IndexableFileReference[]> {
    const results = this.elasticlunrIndex.search(query, { expand: true });
    const fullDataResult = results.map((result) =>
      this.cache.getByHash(result.ref)
    );
    return Promise.all(fullDataResult);
  }
  async exists(id: string) {
    return this.elasticlunrIndex.documentStore.hasDoc(id);
  }
  async serialize() {
    return JSON.stringify(this.elasticlunrIndex);
  }
  async deserialize(indexJson: string) {
    this.elasticlunrIndex = Elasticlunr.Index.load(JSON.parse(indexJson));
  }
  async load() {
    if (await fileExists(this.indexPath)) {
      await this.deserialize(await readFile(this.indexPath));
    }
  }
  async dump() {
    await writeFile(this.indexPath, await this.serialize());
  }
}
