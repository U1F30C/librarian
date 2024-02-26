import { castArray } from "lodash";
import { SearchIndexableFileReference } from "../types/pdf-file-reference";
import { BaseIndexer } from "./BaseIndexer";

import { MeiliSearch, Index, Config } from 'meilisearch'

type ItemKey = keyof SearchIndexableFileReference;

// just validate the keys used are valid
function staticKeys(keys: ItemKey[]): ItemKey[] {
  return keys;
}

export class MeiliSearchIndexer
  implements BaseIndexer<SearchIndexableFileReference>
{
  static indexerType = "meilisearch";
  private client: MeiliSearch;
  private index: Index;
  
  constructor(config: Config) {
    this.client = new MeiliSearch(config);

  }
  async add(item: SearchIndexableFileReference | SearchIndexableFileReference[]): Promise<void> {
    await this.index.addDocuments(castArray(item));
  }
  async remove(id: string): Promise<void> {
    await this.index.deleteDocument(id);
  }
  async put(id: string, item: SearchIndexableFileReference): Promise<void> {
    await this.index.updateDocuments([item]);
  }
  async search(query: string): Promise<SearchIndexableFileReference[]> {
    const results = await this.index.search(query).then((result) => result.hits);
    const fullDataResult = results.map((result) =>
      (this.index.getDocument(result.id))
    );
    return Promise.all(fullDataResult) as Promise<SearchIndexableFileReference[]>;
  }
  async exists(id: string): Promise<boolean> {
    return this.index
      .getDocument(id)
      .then((result) => {
        return !!result;
      }).catch(() => false);
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
        filterableAttributes: staticKeys(["id", "mimeType", "parentId"]),
        searchableAttributes: staticKeys(["title", "content"]),
        displayedAttributes: staticKeys(["id", "title", "mimeType", "listableContent"]),
    });
  }
  async dump() {
    // assume this is unnecessary
  }
}
