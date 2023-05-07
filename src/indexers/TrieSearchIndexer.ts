import TrieSearch from "trie-search";
import { PdfFileReference } from "../types/pdf-file-reference";
import { BaseIndexer } from "./BaseIndexer";
// not viable, doesn't support loading data from json and the indexes are ginnourmous
export class TrieSearchIndexer implements BaseIndexer<PdfFileReference> {
  trieSearchIndex: TrieSearch<PdfFileReference>;
  constructor() {
    const trieSearchIndex = new TrieSearch<PdfFileReference>(
      ["title", "content"],
      {
        idFieldOrFunction: "id",
      }
    );
    this.trieSearchIndex = trieSearchIndex;
  }
  add(item: PdfFileReference) {
    this.trieSearchIndex.add(item);
  }
  search(query) {
    const results = this.trieSearchIndex.get(query);
    return results;
  }
  exists(id: string): boolean {
    return false;
  }
  remove(id: string): void {}
  replace(id: string, item: PdfFileReference): void {}
  serialize() {
    return "";
    // return this.trie.toJSON();
  }
  deserialize(indexJson) {
    // this.trie.fromJSON(indexJson);
  }
  async load() {}
  async dump() {}
}
