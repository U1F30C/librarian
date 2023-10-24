import FlexSearch, {Index} from "flexsearch";
import { fileExists, readFile, writeFile } from "fs-safe";
import { LibrarianCache } from "../cache/cache";
import { IndexableFileReference } from "../types/pdf-file-reference";
import { BaseIndexer } from "./BaseIndexer";

export class FlexSearchIndexer implements BaseIndexer<IndexableFileReference<string>> {
  static indexerType = "flexsearch" as const;
  private index: Index<
    Omit<IndexableFileReference<string>, "id"> & { id: number }
  >;
  private indexIdToActualId: Record<number, string> = {};
  private actualIdToIndexId: Record<string, number> = {};
  constructor(private cache: LibrarianCache, private indexPath: string) {
    // types are wrong
    this.index = new (FlexSearch as any).Index({
      doc: {
        id: "id",
        field: ["title", "content"],
      },
    });
  }
  async add(item: IndexableFileReference) {
    if (!this.exists(item.id)) {
      const now = Date.now();
      this.actualIdToIndexId[item.id] = now;
      this.index.add({
        ...item,
        id: now,
      });
    }
  }
  async remove(id: string) {
    this.index.remove(this.actualIdToIndexId[id] as any);
    delete this.actualIdToIndexId[id];
  }
  async put(id: string, item: IndexableFileReference) {
    this.index.update(this.actualIdToIndexId[id], {
      ...item,
      id: this.actualIdToIndexId[id],
    });
  }
  async search(query: string): Promise<IndexableFileReference[]> {
    const results = await this.index.search(query);
    const fullDataResult = results.map((result) =>
      this.cache.getByHash(this.indexIdToActualId[result.id])
    );
    return Promise.all(fullDataResult);
  }
  async exists(id: string): Promise<boolean> {
    return !!this.actualIdToIndexId[id];
  }
  async serialize() {
    const indexMap: Record<string, any> = {};
    this.index.export((key, value) => {
      indexMap[key] = value;
    });
    return JSON.stringify({
      actualIdToIndexId: this.actualIdToIndexId,
      indexIdToActualId: this.indexIdToActualId,
      indexMap,
    });
  }
  async deserialize(indexJson: string) {
    const deserializedData = await JSON.parse(indexJson);
    this.actualIdToIndexId = deserializedData.actualIdToIndexId;
    this.indexIdToActualId = deserializedData.indexIdToActualId;
    console.log((this.index as any).prototype);
    Object.keys(deserializedData).forEach((key) => {
      this.index = (this.index.import as any)(key, deserializedData[key]);
    });
  }
  async load() {
    if (await fileExists(this.indexPath)) {
      await this.deserialize(await readFile(this.indexPath));
    }
  }
  async dump() {
    await writeFile(this.indexPath, await this.serialize());
  }
}
