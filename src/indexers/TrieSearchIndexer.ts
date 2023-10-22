import TrieSearch from "trie-search";
import { IndexableFileReference } from "../types/pdf-file-reference";
import { BaseIndexer } from "./BaseIndexer";
// not viable, doesn't support loading data from json and the indexes are ginnourmous
export class TrieSearchIndexer implements BaseIndexer<IndexableFileReference> {
  trieSearchIndex: TrieSearch<IndexableFileReference>;
  constructor() {
    const trieSearchIndex = new TrieSearch<IndexableFileReference>(
      ["title", "content"],
      {
        idFieldOrFunction: "id",
      }
    );
    this.trieSearchIndex = trieSearchIndex;
  }
  add(item: IndexableFileReference) {
    this.trieSearchIndex.add(item);
  }
  async search(query: string) {
    const results = this.trieSearchIndex.get(query);
    return results;
  }
  exists(id: string): boolean {
    throw new Error("Not implemented");
  }
  remove(id: string): void {
    throw new Error("Not implemented");
  }
  put(id: string, item: IndexableFileReference): void {
    throw new Error("Not implemented");
  }
  serialize() {
    throw new Error("Not implemented");
    return "";
  }
  deserialize(indexJson) {
    throw new Error("Not implemented");
  }
  async load() {
    throw new Error("Not implemented");
  }
  async dump() {
    throw new Error("Not implemented");
  }
}
