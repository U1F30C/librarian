import { LibrarianCache } from "../cache/cache";
import { IndexableFileReference } from "../types/pdf-file-reference";
import { rawLinesToPlainText } from "../utils/raw-lines-to-plain-text";
import { BaseIndexer } from "./BaseIndexer";

import { MeiliSearch, Index } from 'meilisearch'


export class MeiliSearchIndexer
  implements BaseIndexer<IndexableFileReference<string>>
{
  static indexerType = "meilisearch";
  private client: MeiliSearch;
  private index: Index;
  
  constructor(private cache: LibrarianCache, private indexPath: string) {
    this.client = new MeiliSearch({
      host: "http://127.0.0.1:7700",
      apiKey: "masterKey",
    });

  }
  async add(item: any): Promise<void> {
    await this.index.addDocuments([item]);
  }
  async remove(id: string): Promise<void> {
    await this.index.deleteDocument(id);
  }
  async put(id: string, item: any): Promise<void> {
    await this.index.updateDocuments([item]);
  }
  async search(query: string): Promise<IndexableFileReference[]> {
    const results = await this.index.search(query).then((result) => result.hits);
    const fullDataResult = results.map((result) =>
      (this.cache.getByHash(result.id))
    );
    return Promise.all(fullDataResult);
  }
  async exists(id: string): Promise<boolean> {
    return this.index
      .search("", {
        filter: [`id = ${id}`],
      })
      .then((result) => {
        return result.hits.length > 0;
      });
  }
  async serialize(): Promise<string> {
    throw new Error("Not implemented");
  }
  async deserialize(indexJson: string) {
    throw new Error("Not implemented");
  }
  async load() {
    this.index = this.client.index("files");
    await this.index.updateSettings({
        filterableAttributes: ["id", "mimeType"],
        searchableAttributes: ["title", "content"],
        
        displayedAttributes: ["id", "title", "mimeType"],
        // faceting: {
        // typoTolerance: false,
    });
  }
  async dump() {
    // assume this is unnecessary
  }
}
