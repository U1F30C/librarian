import { Page } from "pdf-text-reader";

export function rawLinesToPlainText(lines: Page[]) {
  return lines.map((page) => page.lines.join(" ")).join("\n");
}
