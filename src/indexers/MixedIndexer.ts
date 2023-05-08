import lodash from "lodash";
import { PdfFileReference } from "../types/pdf-file-reference";
import { BaseIndexer } from "./BaseIndexer";

export class MixedIndexer implements BaseIndexer<PdfFileReference<string>> {
  static indexerType = "mixed";
  constructor(private indexers: BaseIndexer<PdfFileReference<string>>[]) {}
  private applyToAllIndexers<MethodReturn>(
    fn: (indexer: BaseIndexer<PdfFileReference<string>>) => MethodReturn
  ) {
    return this.indexers.map(fn);
  }
  add(item: PdfFileReference): void {
    this.applyToAllIndexers((indexer) => indexer.add(item));
  }
  remove(id: string): void {
    this.applyToAllIndexers((indexer) => indexer.remove(id));
  }
  put(id: string, item: PdfFileReference): void {
    this.applyToAllIndexers((indexer) => indexer.put(id, item));
  }
  search(query: string): PdfFileReference[] {
    return lodash.uniqBy(
      this.applyToAllIndexers((indexer) => indexer.search(query)).flat(),
      (reference) => reference.id
    );
  }
  exists(id: string): boolean {
    return this.applyToAllIndexers((indexer) => indexer.exists(id)).every(
      (exists) => exists
    );
  }
  serialize(): string {
    throw new Error("Not implemented");
  }
  deserialize(indexJson: string) {
    throw new Error("Not implemented");
  }
  async load() {
    await Promise.all(this.applyToAllIndexers((indexer) => indexer.load()));
  }
  async dump() {
    await Promise.all(this.applyToAllIndexers((indexer) => indexer.dump()));
  }
}
