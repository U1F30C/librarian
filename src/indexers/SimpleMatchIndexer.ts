import { LibrarianCache } from "../cache/cache";
import { PdfFileReference } from "../types/pdf-file-reference";
import { rawLinesToPlainText } from "../utils/raw-lines-to-plain-text";
import { BaseIndexer } from "./BaseIndexer";

export class SimpleMatchIndexer
  implements BaseIndexer<PdfFileReference<string>>
{
  static indexerType = "simplematch";
  cache: LibrarianCache;
  constructor(cache: LibrarianCache, private indexPath: string) {
    this.cache = cache.clone();
  }
  add(item: any): void {
    // assume this is unnecessary
  }
  remove(id: string): void {
    // the originalcache might keep ghost keys but they should be ignored in the search
    this.cache.unset(id);
  }
  put(id: string, item: any): void {
    // assume this is unnecessary
  }
  search(query: string): PdfFileReference[] {
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
  exists(id: string): boolean {
    return !!this.cache.get(id);
  }
  serialize(): string {
    throw new Error("Not implemented");
    return "";
  }
  deserialize(indexJson: string) {
    throw new Error("Not implemented");
  }
  async load() {
    // assume this is unnecessary
  }
  async dump() {
    // assume this is unnecessary
  }
}
