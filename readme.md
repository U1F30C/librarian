# Pdf librarian
Tool assembled from a few different pacakages to quickly search pdfs files
It will:
- Scan a directory for pdf files
- Extract plain text from files using `pdf-text-reader`
- Search using either (or various) of the following:
  - Elasticlunr
  - Minisearch
  - Simple match searcher
- Keep a cache of the file contents and indexes
- Highlight all of the occurrences of the search term

## Inspiration
I wanted to search in a bunch of pdf files, quickly. I used to use pdfgrep but that was a bit slow even with the cache and the cache didn't last for long. I thought it'b be funnier to make my own tool rather than modifying pdfgrep to extend the cache lifespan.

