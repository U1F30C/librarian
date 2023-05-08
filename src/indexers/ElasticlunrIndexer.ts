import Elasticlunr from "elasticlunr";
import { fileExists, readFile, writeFile } from "fs-safe";
import { LibrarianCache } from "../cache/cache";
import { PdfFileReference } from "../types/pdf-file-reference";
import { BaseIndexer } from "./BaseIndexer";

export class ElasticlunrIndexer implements BaseIndexer<PdfFileReference<string>> {
  static indexerType = "elasticlunr";
  private elasticlunrIndex: Elasticlunr.Index<PdfFileReference>;
  constructor(private cache: LibrarianCache, private indexPath: string) {
    const elasticlunrIndex = Elasticlunr<PdfFileReference>(function (this) {
      this.setRef("id");

      this.addField("title");
      this.addField("content");
      this.saveDocument(false);
    });
    this.elasticlunrIndex = elasticlunrIndex;
  }
  add(item: PdfFileReference) {
    if (!this.exists(item.id)) this.elasticlunrIndex.addDoc(item);
  }
  remove(id: string) {
    this.elasticlunrIndex.removeDocByRef(id);
  }
  put(id: string, item: PdfFileReference) {
    if (this.exists(id)) this.remove(id);
    this.add(item);
  }
  search(query: string): PdfFileReference[]  {
    const results = this.elasticlunrIndex.search(query, { expand: true });
    return results.map((result) => this.cache.get(result.ref));
  }
  exists(id: string): boolean {
    return this.elasticlunrIndex.documentStore.hasDoc(id);
  }
  serialize() {
    return JSON.stringify(this.elasticlunrIndex);
  }
  async deserialize(indexJson: string) {
    this.elasticlunrIndex = Elasticlunr.Index.load(JSON.parse(indexJson));
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
