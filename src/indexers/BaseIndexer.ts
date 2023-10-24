export interface BaseIndexer<T> {
  add(item: T): Promise<void>;
  remove(id: string): Promise<void>;
  put(id: string, item: T): Promise<void>;
  search(query: string): Promise<T[]>;
  exists(id: string): Promise<boolean>;

  serialize(): Promise<string | Buffer>;
  deserialize(indexJson: string | Buffer): Promise<void>;
  load(): Promise<void>;
  dump(): Promise<void>;
}
