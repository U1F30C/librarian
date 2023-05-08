import { LibrarianCache } from "../cache/cache";
import { PdfFileReference } from "../types/pdf-file-reference";
import { rawLinesToPlainText } from "../utils/raw-lines-to-plain-text";
import { BaseIndexer } from "./BaseIndexer";

export class SimpleMatchIndexer implements BaseIndexer<PdfFileReference<string>> {
  static indexerType = "simplematch";
  constructor(private cache: LibrarianCache, private indexPath: string) {}
  add(item: any): void {}
  remove(id: string): void {}
  put(id: string, item: any): void {}
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
    return "";
  }
  deserialize(indexJson: string) {}
  async load() {}
  async dump() {}
}
