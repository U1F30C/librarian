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
import { PdfFileReference } from "./types/pdf-file-reference";
import { getActionSkipper } from "./utils/action-skipper.ts";
import { logger } from "./utils/logger.ts";
import { rawLinesToPlainText } from "./utils/raw-lines-to-plain-text.ts";

async function readPdfText(path: string) {
  const pages = await _readPdfText(path);
  return pages;
}
const actionControllers = {
  saveCache: getActionSkipper(10),
  [MinisearchIndexer.indexerType]: getActionSkipper(10),
  [ElasticlunrIndexer.indexerType]: getActionSkipper(10),
};

async function getFileContent(
  key: string,
  path: string,
  cache: LibrarianCache
) {
  if (!cache.get(key)) {
    logger.log(" - Cache miss: ", key);
    const content = await readPdfText(path);
    cache.set(key, { id: key, title: key, content });
    actionControllers.saveCache.step();
    if (actionControllers.saveCache.shouldAct()) {
      logger.log(" ---------------------- Saving cache");
      await cache.dump();
    }
  }
  const fileReference = cache.get(key);
  return rawLinesToPlainText(fileReference.content);
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
  const searchDir = process.argv[2] ?? ".";
  logger.log("Root search dir: ", searchDir);
  const workDir = ".";
  const cacheFileName = "librarian-cache.json";
  const cachePath = join(workDir, cacheFileName);
  const cache = new LibrarianCache(cachePath);
  logger.log("Loadig cache");
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
  const searchIndexers: BaseIndexer<PdfFileReference>[] = [
    elasticLunrIndexer,
    minisearchIndexer,
    simpleMatchIndexer,
  ];
  for (const indexer of searchIndexers) {
    await indexer.load();
  }

  if (!(await dirExists(searchDir)))
    throw new Error("Search directory does not exist");
  const dirs = await readDir(searchDir, { recursive: true });
  const pdfDirs = dirs!.filter((dir) => dir.endsWith(".pdf"));
  for (const pdfDir of pdfDirs) {
    const absolutePdfDir = join(searchDir, pdfDir);
    try {
      logger.log("Processing: ", pdfDir);
      const pdfText: string = await getFileContent(
        pdfDir,
        absolutePdfDir,
        cache
      );
      const fileEntry: PdfFileReference = {
        id: pdfDir,
        title: pdfDir,
        content: pdfText,
      };

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

  await cache.dump();
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
      const searchResults = indexer.search(searchTerm);
      console.timeEnd(indexerName);
      for (const result of searchResults) {
        const pdfRawText = rawLinesToPlainText(result.content);
        const occurences = findAllOccurences(pdfRawText, searchTerm);
        const titleOccurrences = findAllOccurences(result.title, searchTerm);
        for (const occurence of occurences) {
          logger.log(
            chalk.magenta(result.id + ":"),
            highlight(pdfRawText, occurence, searchTerm.length, 25)
          );
        }
        if (titleOccurrences.length > 0) console.log(chalk.blue(result.title));
      }
    }
  }
}
main();
