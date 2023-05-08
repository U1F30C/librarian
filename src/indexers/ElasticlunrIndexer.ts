import Elasticlunr from "elasticlunr";
import { fileExists, readFile, writeFile } from "fs-safe";
import { LibrarianCache } from "../cache/cache";
import { PdfFileReference } from "../types/pdf-file-reference";
import { BaseIndexer } from "./BaseIndexer";

export class ElasticlunrIndexer
  implements BaseIndexer<PdfFileReference<string>>
{
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
    // console.log("    add", ElasticlunrIndexer.indexerType, item.id);
    if (!this.exists(item.id)) this.elasticlunrIndex.addDoc(item);
  }
  remove(id: string) {
    // console.log("    remove", ElasticlunrIndexer.indexerType, id);
    this.elasticlunrIndex.removeDocByRef(id);
  }
  put(id: string, item: PdfFileReference) {
    // console.log("    put", ElasticlunrIndexer.indexerType, item.id);
    if (this.exists(id)) this.remove(id);
    this.add(item);
  }
  search(query: string): PdfFileReference[] {
    const results = this.elasticlunrIndex.search(query, { expand: true });
    return results.map((result) => this.cache.get(result.ref));
  }
  exists(id: string): boolean {
    const result = this.elasticlunrIndex.documentStore.hasDoc(id);
    console.log("    exists", ElasticlunrIndexer.indexerType, result);
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
    console.log("    dump", ElasticlunrIndexer.indexerType);
    // console.log(
    //   "    exists Brent_GBC.pdf",
    //   ElasticlunrIndexer.indexerType,
    //   this.exists("Brent_GBC.pdf")
    // );
    await writeFile(this.indexPath, this.serialize());
  }
}
