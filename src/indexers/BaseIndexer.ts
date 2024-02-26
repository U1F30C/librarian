export interface BaseIndexer<Item> {
  add(item: Item | Item[]): Promise<void>;
  remove(id: string): Promise<void>;
  put(id: string, item: Item): Promise<void>;
  search(query: string): Promise<Item[]>;
  exists(id: string): Promise<boolean>;

  serialize(): Promise<string | Buffer>;
  deserialize(indexJson: string | Buffer): Promise<void>;
  load(): Promise<void>;
  dump(): Promise<void>;
}
