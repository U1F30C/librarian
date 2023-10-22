export interface BaseIndexer<T> {
  add(item: T): void;
  remove(id: string): void;
  put(id: string, item: T): void;
  search(query: string): Promise<T[]>;
  exists(id: string): boolean;

  serialize(): string;
  deserialize(indexJson: string): void;
  load(): Promise<void>;
  dump(): Promise<void>;
}
