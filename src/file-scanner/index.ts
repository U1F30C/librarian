import { dirExists, readDir } from "fs-safe";
import { join } from "path";

import { readFile } from "fs/promises";
import mime from "mime-types";
import { LibrarianCache } from "../cache/cache.ts";
import { SearchIndexableFileReference } from "../types/pdf-file-reference";
import { hash } from "../utils/hash.ts";
import { logger } from "../utils/logger.ts";
import { BaseIndexer } from "../indexers/BaseIndexer.ts";
import { chunk } from "lodash";
import { sleep } from "../utils/sleep.ts";


const supportedEextensions = ["pdf", "json", "txt", "md", "html", "jpeg", "jpg", "png"] as const;
const supportedEextensionsRegex = new RegExp(
  `\.(${supportedEextensions.join("|")})$`,
  "i"
);

export class FileScannerIndexer {
  constructor(
    private indexer: BaseIndexer<SearchIndexableFileReference>,
    private cache: LibrarianCache
  ) {}
  async getFileContent(
    relativePath: string,
    absolutePath: string
  ): Promise<SearchIndexableFileReference[]> {
    let fileReference: SearchIndexableFileReference[] | null =
      await this.cache.getByPath(relativePath);
    if (!fileReference) {
      logger.log(" - Cache miss: ", relativePath);
      const fileBinaryData = await readFile(absolutePath);
      const fileHash = await hash(fileBinaryData);
      fileReference = await this.cache.getByHash(fileHash, relativePath);
      if (!fileReference) {
        logger.log("   - Backup cache key miss: ", relativePath);
        fileReference = await this.cache.set({
          id: fileHash,
          title: relativePath,
          content: fileBinaryData,
          mimeType:
            (mime.lookup(relativePath) as string) ?? "application/octet-stream",
        });
      }
    }
    return fileReference;
  }

  async scanAndIndexFiles(searchDir: string) {
    if (!(await dirExists(searchDir)))
      throw new Error("Search directory does not exist");
    const dirs = await readDir(searchDir, { recursive: true });
    const pdfDirs = dirs!.filter((dir) => supportedEextensionsRegex.test(dir));

    const chunkedPdfDirs = chunk(pdfDirs, 10);

    let i = 0;
    for (const pdfDirChunk of chunkedPdfDirs) {
      await sleep(2000);
      const queue: SearchIndexableFileReference[] = [];
      for (const pdfDir of pdfDirChunk) {
        // if (shouldExit) break;
        const absolutePdfDir = join(searchDir, pdfDir);
        try {
          logger.log(`${++i}/${pdfDirs.length} - Processing: `, pdfDir);
          const fileEntres = await this.getFileContent(pdfDir, absolutePdfDir);

          const lastFileFragment = fileEntres[fileEntres.length - 1];

          if (await this.indexer.exists(lastFileFragment.id)) {
            logger.log(
              " - Index entry exists, skipping the lot",
              lastFileFragment.id
            );
            continue;
          }

          for (const fileEntry of fileEntres) {
            const entryExists = await this.indexer.exists(fileEntry.id);
            if (!entryExists) {
              logger.log(" - New index entry, indexing", fileEntry.id);
              queue.push(fileEntry);
            } else {
              logger.log(" - Index entry exists, skipping", fileEntry.id);
              // TODO:
            }
          }
        } catch (e) {
          logger.error(pdfDir, e);
        }
      }
      await this.indexer.add(queue);
    }
  }
}
