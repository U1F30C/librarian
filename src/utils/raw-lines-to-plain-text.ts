import { Page } from "pdf-text-reader";

export function rawLinesToPlainTextPages(pages: Page[]) {
  return pages.map((page) => page.lines.join("\n"));
}

export function plainTextPagesToPlainText(pages: string[]) {
  return pages.join("\n");
}