import chalk from "chalk";
import { dirExists, readDir } from "fs-safe";
import inquirer from "inquirer";
import { join } from "path";
import { readPdfText as _readPdfText } from "pdf-text-reader";
import { LibrarianCache } from "./cache/cache.ts";
import { BaseIndexer } from "./indexers/BaseIndexer.ts";
import { ElasticlunrIndexer } from "./indexers/ElasticlunrIndexer.ts";
import { MinisearchIndexer } from "./indexers/MinisearchIndexer.ts";
import { SimpleMatchIndexer } from "./indexers/SimpleMatchIndexer.ts";
import { IndexableFileReference } from "./types/pdf-file-reference";
import { getActionSkipper } from "./utils/action-skipper.ts";
import { logger } from "./utils/logger.ts";
import { hash } from "./utils/hash.ts";
import { readFile } from "fs/promises";

let shouldExit = false;
process.on("SIGINT", function () {
  shouldExit = true;
  logger.log("Caught interrupt signal");
});

async function readPdfText(data: Buffer) {
  const pages = await _readPdfText(data);
  return pages;
}
const actionControllers = {
  [MinisearchIndexer.indexerType]: getActionSkipper(10),
  [ElasticlunrIndexer.indexerType]: getActionSkipper(10),
} as const;

async function getFileContent(
  relativePath: string,
  absolutePath: string,
  cache: LibrarianCache
): Promise<IndexableFileReference> {
  if (!(await cache.getByPath(relativePath))) {
    logger.log(" - Cache miss: ", relativePath);
    const fileBinaryData = await readFile(absolutePath);
    const content = await readPdfText(fileBinaryData);
    const fileHash = await hash(fileBinaryData);
    if(!await cache.getByHash(fileHash, relativePath)) {
      logger.log("   - Backup cache key miss: ", relativePath);
      await cache.set(
        relativePath,
        fileHash,
        {
          id: fileHash,
          title: relativePath,
          content: JSON.stringify(content),
        },
        "application/pdf",
      );
    }
  }
  const fileReference = await cache.getByPath(relativePath);
  return fileReference.content;
}

function findAllOccurences(text: string, query: string): number[] {
  const result: number[] = [];
  text = text.toLowerCase();
  query = query.toLowerCase();
  let startIndex = text.indexOf(query);
  while (startIndex !== -1) {
    result.push(startIndex);
    startIndex = text.indexOf(query, startIndex + 1);
  }
  return result;
}

const highlight = (
  text: string,
  startIndex: number,
  queryLength: number,
  padding: number
) => {
  const endIndex = startIndex + queryLength;
  const result =
    text.substring(Math.max(0, startIndex - padding), startIndex) +
    chalk.redBright(text.substring(startIndex, endIndex)) +
    text.substring(endIndex, endIndex + padding);
  return result;
};

async function main() {
  console.log(process.argv);
  const searchDir = process.argv[3] ?? ".";
  logger.log("Root search dir: ", searchDir);
  const workDir = ".";
  const cacheFileName = "librarian-cache.db";
  const cachePath = join(workDir, cacheFileName);
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
  const searchIndexers: BaseIndexer<IndexableFileReference>[] = [
    elasticLunrIndexer,
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
  const pdfDirs = dirs!.filter((dir) => dir.endsWith(".pdf"));
  for (const pdfDir of pdfDirs) {
    if (shouldExit) process.exit(0);
    const absolutePdfDir = join(searchDir, pdfDir);
    try {
      logger.log("Processing: ", pdfDir);
      const fileEntry = await getFileContent(
        pdfDir,
        absolutePdfDir,
        cache
      );

      for (const indexer of searchIndexers) {
        const newIndexEntry = !indexer.exists(fileEntry.id);
        if (newIndexEntry) {
          logger.log(" - New index entry, indexing");

          indexer.add(fileEntry);
          const indexerName = (indexer as any).constructor.indexerType;
          actionControllers[indexerName].step();
          if (actionControllers[indexerName].shouldAct()) {
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
  while (true) {
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
        const fileRef = result.content;
        const occurences = findAllOccurences(fileRef.content, searchTerm);
        const titleOccurrences = findAllOccurences(result.title, searchTerm);
        for (const occurence of occurences) {
          logger.log(
            chalk.magenta(result.title + ":"),
            highlight(fileRef.content, occurence, searchTerm.length, 25)
          );
        }
        if (titleOccurrences.length > 0) console.log(chalk.blue(result.title));
      }
    }
  }
  process.exit(0);
}
main();
