import { dirExists, readDir } from "fs-safe";
import inquirer from "inquirer";
import { join } from "path";

import { readFile } from "fs/promises";
import mime from "mime-types";
import { LibrarianCache } from "./cache/cache.ts";
import { BaseIndexer } from "./indexers/BaseIndexer.ts";
import { ElasticlunrIndexer } from "./indexers/ElasticlunrIndexer.ts";
import { MinisearchIndexer } from "./indexers/MinisearchIndexer.ts";
import { SimpleMatchIndexer } from "./indexers/SimpleMatchIndexer.ts";
import { IndexableFileReference } from "./types/pdf-file-reference";
import { getActionSkipper } from "./utils/action-skipper.ts";
import { hash } from "./utils/hash.ts";
import { logger } from "./utils/logger.ts";
import {
  findAllOccurences,
  highlightTitleOccurrences,
  highlightWithContext,
  hightlightSeparator,
} from "./utils/result-reporting.ts";
import { singletonOcrRef } from "./utils/ocr.ts";
import { FlexSearchIndexer } from "./indexers/FlexsearchIndexer.ts";
import { MeiliSearchIndexer } from "./indexers/MeilisearchIndexer.ts";

const supportedEextensions = ["pdf", "json", "txt", "md", "html", "jpeg", "jpg", "png" ] as const;
const supportedEextensionsRegex = new RegExp(
  `\.(${supportedEextensions.join("|")})$`,
  "i"
);

let shouldExit = false;
process.on("SIGINT", function () {
  shouldExit = true;
  logger.log("Caught interrupt signal");
});

const actionControllers = {
  [FlexSearchIndexer.indexerType]: getActionSkipper(100),
  [MinisearchIndexer.indexerType]: getActionSkipper(100),
  [ElasticlunrIndexer.indexerType]: getActionSkipper(10),
} as const;

async function getFileContent(
  relativePath: string,
  absolutePath: string,
  cache: LibrarianCache
): Promise<IndexableFileReference> {
  let fileReference: IndexableFileReference<string> = await cache.getByPath(relativePath);
  if (!fileReference) {
    logger.log(" - Cache miss: ", relativePath);
    const fileBinaryData = await readFile(absolutePath);
    const fileHash = await hash(fileBinaryData);
    fileReference = await cache.getByHash(fileHash, relativePath);
    if (!fileReference) {
      logger.log("   - Backup cache key miss: ", relativePath);
      fileReference = await cache.set(
        {
          id: fileHash,
          title: relativePath,
          content: fileBinaryData,
        },
        mime.lookup(relativePath) as string ?? "application/octet-stream"
      );
    }
  }
  return fileReference;
}

async function main() {
  const searchDir = process.argv[4] ?? ".";
  logger.log("Root search dir: ", searchDir);
  const workDir = ".";
  const cacheFileName = "librarian-cache.db";
  const cachePath = join(workDir, cacheFileName);
  await singletonOcrRef.initialize()
  const cache = new LibrarianCache(cachePath);
  logger.log("Loading cache");
  await cache.load();
  const elasticLunrIndexer = new ElasticlunrIndexer(
    cache,
    join(workDir, `librarian-index-${ElasticlunrIndexer.indexerType}.json`)
  );
  const minisearchIndexer = new MinisearchIndexer(
    cache,
    join(workDir, `librarian-index-${MinisearchIndexer.indexerType}.json`)
  );
  const simpleMatchIndexer = new SimpleMatchIndexer(
    cache,
    join(workDir, `librarian-index-${SimpleMatchIndexer.indexerType}.json`)
  );
  const flexSearchIndexer = new FlexSearchIndexer(
    cache,
    join(workDir, `librarian-index-${FlexSearchIndexer.indexerType}.json`)
  );
  const meilisearch = new MeiliSearchIndexer(
    cache,
    join(workDir, `librarian-index-${MeiliSearchIndexer.indexerType}.json`)
  );
  const searchIndexers: BaseIndexer<IndexableFileReference>[] = [
    meilisearch,
    // elasticLunrIndexer,
    // minisearchIndexer,
    // simpleMatchIndexer,
  ];
  logger.log("Loading indexers");
  for (const indexer of searchIndexers) {
    logger.log(" - ", (indexer as any).constructor.indexerType);
    await indexer.load();
  }

  if (!(await dirExists(searchDir)))
    throw new Error("Search directory does not exist");
  const dirs = await readDir(searchDir, { recursive: true });
  const pdfDirs = dirs!.filter((dir) => supportedEextensionsRegex.test(dir));
  for (const pdfDir of pdfDirs) {
    if (shouldExit) break;
    const absolutePdfDir = join(searchDir, pdfDir);
    try {
      logger.log("Processing: ", pdfDir);
      const fileEntry = await getFileContent(pdfDir, absolutePdfDir, cache);

      for (const indexer of searchIndexers) {
        const newIndexEntry = !await indexer.exists(fileEntry.id);
        if (newIndexEntry) {
          logger.log(" - New index entry, indexing");

          await indexer.add(fileEntry);
          const indexerName = (indexer as any).constructor.indexerType;
          actionControllers[indexerName]?.step();
          if (actionControllers[indexerName]?.shouldAct()) {
            logger.log(" ---------------------- Writting index");
            await indexer.dump();
          }
        } else {
          // TODO: remove
          // logger.log(" - Renewing entry");
          // indexer.replace(fileEntry.id, fileEntry);
        }
      }
    } catch (e) {
      logger.error(pdfDir, e);
    }
  }

  await Promise.all(searchIndexers.map((indexer) => indexer.dump()));
  while (!shouldExit) {
    const answer = await inquirer.prompt({
      type: "input",
      name: "searchTerm",
      message: "Search term: ",
    });
    const searchTerm = answer.searchTerm;
    logger.log("Searching for: ", searchTerm);
    for (const indexer of searchIndexers) {
      const indexerName = (indexer as any).constructor.indexerType;
      console.time(indexerName);
      const searchResults = await indexer.search(searchTerm);
      console.timeEnd(indexerName);
      for (const result of searchResults) {
        const occurences = findAllOccurences(result.content, searchTerm);
        const titleOccurrences = findAllOccurences(result.title, searchTerm);
        for (const occurence of occurences) {
          logger.log(
            hightlightSeparator(result.title),
            highlightWithContext(
              result.content,
              occurence,
              searchTerm.length,
              25
            )
          );
        }
        if (titleOccurrences.length > 0)
          logger.log(highlightTitleOccurrences(result.title));
      }
    }
  }
  process.exit(0);
}
main();
