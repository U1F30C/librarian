import inquirer from "inquirer";
import {
  findAllOccurences,
  highlightTitleOccurrences,
  highlightWithContext,
  hightlightSeparator,
} from "./result-reporting.ts";
import { logger } from "../../utils/logger.ts";
import { BaseIndexer } from "../../indexers/BaseIndexer.ts";
import { SearchIndexableFileReference } from "../../types/pdf-file-reference.ts";

export async function promptAndSearch(
  indexer: BaseIndexer<SearchIndexableFileReference>
) {
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
