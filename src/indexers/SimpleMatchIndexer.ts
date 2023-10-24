import { LibrarianCache } from "../cache/cache";
import { IndexableFileReference } from "../types/pdf-file-reference";
import { rawLinesToPlainText } from "../utils/raw-lines-to-plain-text";
import { BaseIndexer } from "./BaseIndexer";

export class SimpleMatchIndexer
  implements BaseIndexer<IndexableFileReference<string>>
{
  static indexerType = "simplematch";
  cache: LibrarianCache;
  constructor(cache: LibrarianCache, private indexPath: string) {
    // this.cache = cache.clone();
  }
  async add(item: any) {
    // assume this is unnecessary
  }
  async remove(id: string) {
    // the originalcache might keep ghost keys but they should be ignored in the search
    // this.cache.unset(id);
  }
  async put(id: string, item: any) {
    // assume this is unnecessary
  }
  async search(query: string): Promise<IndexableFileReference[]> {
    const store = this.cache.getCacheStore();
    // const results = Object.entries(store).filter(([key, value]) => {
    //   return (
    //     value.title.toLowerCase().includes(query.toLowerCase()) ||
    //     value.content.some((content) =>
    //       content.lines.some((line) =>
    //         line.toLowerCase().includes(query.toLowerCase())
    //       )
    //     )
    //   );
    // });
    const results = Object.entries(store).filter(([key, value]) => {
      return (
        value.title.toLowerCase().includes(query.toLowerCase()) ||
        rawLinesToPlainText(value.content)
          .toLowerCase()
          .includes(query.toLowerCase())
      );
    });
    return results.map(([key, value]) => value);
  }
  async exists(id: string) {
    return !!this.cache.getByPath(id);
  }
  async serialize(): Promise<string> {
    throw new Error("Not implemented");
    return "";
  }
  async deserialize(indexJson: string) {
    throw new Error("Not implemented");
  }
  async load() {
    // assume this is unnecessary
  }
  async dump() {
    // assume this is unnecessary
  }
}
