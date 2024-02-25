import { dirExists, readDir } from "fs-safe";
import inquirer from "inquirer";
import { join } from "path";

import { readFile } from "fs/promises";
import mime from "mime-types";
import { LibrarianCache } from "./cache/cache.ts";
import { IndexableFileReference } from "./types/pdf-file-reference";
import { hash } from "./utils/hash.ts";
import { logger } from "./utils/logger.ts";
import {
  findAllOccurences,
  highlightTitleOccurrences,
  highlightWithContext,
  hightlightSeparator,
} from "./utils/result-reporting.ts";
import { singletonOcrRef } from "./utils/ocr.ts";
import { MeiliSearchIndexer } from "./indexers/MeilisearchIndexer.ts";
import { BaseIndexer } from "./indexers/BaseIndexer.ts";

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

async function getFileContent(
  relativePath: string,
  absolutePath: string,
  cache: LibrarianCache
): Promise<IndexableFileReference> {
  let fileReference: IndexableFileReference<string> = await cache.getByPath(
    relativePath
  );
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
          mimeType: (mime.lookup(relativePath) as string) ?? "application/octet-stream",
        },
      );
    }
  }
  return fileReference;
}

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
  const indexer: BaseIndexer<IndexableFileReference<string>> = new MeiliSearchIndexer(
    cache,
    join(workDir, `librarian-index-${MeiliSearchIndexer.indexerType}.json`)
  );
  logger.log("Loading indexers");

  logger.log(" - ", (indexer as any).constructor.indexerType);
  await indexer.load();

  if (!(await dirExists(searchDir)))
    throw new Error("Search directory does not exist");
  const dirs = await readDir(searchDir, { recursive: true });
  const pdfDirs = dirs!.filter((dir) => supportedEextensionsRegex.test(dir));
  let i = 0;
  for (const pdfDir of pdfDirs) {
    if (shouldExit) break;
    const absolutePdfDir = join(searchDir, pdfDir);
    try {
      logger.log(`${++i}/${pdfDirs.length} - Processing: `, pdfDir);
      const fileEntry = await getFileContent(pdfDir, absolutePdfDir, cache);

      const entryExists = await indexer.exists(fileEntry.id);
      if (!entryExists) {
        logger.log(" - New index entry, indexing");

        await indexer.add(fileEntry);
      } else {
        // TODO: 
      }
    } catch (e) {
      logger.error(pdfDir, e);
    }
  }

  while (!shouldExit) {
    const answer = await inquirer.prompt({
      type: "input",
      name: "searchTerm",
      message: "Search term: ",
    });
    const searchTerm = answer.searchTerm;
    logger.log("Searching for: ", searchTerm);
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
          highlightWithContext(result.content, occurence, searchTerm.length, 25)
        );
      }
      if (titleOccurrences.length > 0)
        logger.log(highlightTitleOccurrences(result.title));
    }
  }
  process.exit(0);
}
main();
