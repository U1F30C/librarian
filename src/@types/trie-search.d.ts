declare module "trie-search" {
  class TrieSearch<T> {
    constructor(
      keyFields: string | string[] | Array<string | string[]>,
      options?: {
        min?: number;
        ignoreCase?: boolean;
        indexField?: string;
        idFieldOrFunction?: string | ((this: T, key: string) => string);
        splitOnRegEx?: RegExp | false;
        expandRegexes?: RegExp[];
      }
    );

    public add(obj: T): TrieSearch<T>;

    public addAll(arr: T[]): TrieSearch<T>;

    public get(key: string): T[];

    public get(prefix: string, count: number): T[];

    public delete(obj: T): boolean;

    public deleteAll(obj: T[]): TrieSearch<T>;

    public clear(): void;

    public toJSON(): string;

    public fromJSON(data: string): void;
  }

  export default TrieSearch;
}
