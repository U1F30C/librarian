import { join } from "path";

import { LibrarianCache } from "./cache/cache.ts";
import { SearchIndexableFileReference } from "./types/pdf-file-reference";
import { logger } from "./utils/logger.ts";
import { singletonOcrRef } from "./utils/ocr.ts";
import { MeiliSearchIndexer } from "./indexers/MeilisearchIndexer.ts";
import { BaseIndexer } from "./indexers/BaseIndexer.ts";
import { promptAndSearch } from "./search-interfaces/cli-search/index.ts";
import { FileScannerIndexer } from "./file-scanner/index.ts";
import { startInstantMeiliSearchServer } from "./search-interfaces/instant-meilisearch-server/index.ts";


let shouldExit = false;
// process.on("SIGINT", function () {
//   shouldExit = true;
//   logger.log("Caught interrupt signal");
// });

async function main() {
  const searchDir = process.argv[4];
  if (!searchDir) throw new Error("Missing search directory");

  logger.log("Root search dir: ", searchDir);
  const workDir = ".";
  const cacheFileName = "librarian-cache.db";
  const cachePath = join(workDir, cacheFileName);
  await singletonOcrRef.initialize();
  const cache = new LibrarianCache(cachePath);
  logger.log("Loading cache");
  await cache.load();
  const meilisearchConfig = {
    host: "http://127.0.0.1:7700",
    apiKey: "masterKey",
  };
  const indexer: BaseIndexer<SearchIndexableFileReference> =
    new MeiliSearchIndexer(meilisearchConfig);
  logger.log("Loading indexers");

  logger.log(" - ", (indexer as any).constructor.indexerType);
  await indexer.load();

  const fileScanner = new FileScannerIndexer(indexer, cache);
  // await fileScanner.scanAndIndexFiles(searchDir);

  startInstantMeiliSearchServer(meilisearchConfig, 3007);
}
main();
