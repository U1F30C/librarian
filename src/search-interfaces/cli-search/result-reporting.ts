import chalk from "chalk";

export function findAllOccurences(text: string, query: string): number[] {
  const result: number[] = [];
  text = text.toLowerCase();
  query = query.toLowerCase();
  let startIndex = text.indexOf(query);
  while (startIndex !== -1) {
    result.push(startIndex);
    startIndex = text.indexOf(query, startIndex + 1);
  }
  return result.slice(0, 1);
}

export const hightlightSeparator = (title: string) => {
  return chalk.magenta(title + ":");
};

export const highlightTitleOccurrences = (title: string) => {
  return chalk.blue(title);
};

export const highlightWithContext = (
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
