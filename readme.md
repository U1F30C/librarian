# Pdf librarian
Tool assembled from a few different packages to quickly search pdfs files
It will:
- Scan a directory for pdf files
- Extract plain text from files using `pdf-text-reader`
- Search using either (or various) of the following:
  - Meilisearch
  - Elasticlunr
  - Minisearch
  - Others todo (don't do triesearch, index is too big)
- Keep a cache of the file contents and indexes and keep file hash to detect renamings to avoid reprocessing files
- Highlight all of the occurrences of the search term

## Inspiration
I wanted to search in a bunch of pdf files, quickly. I used to use pdfgrep but that was a bit slow even with the cache and the cache didn't last for long. I thought it'b be funnier to make my own tool rather than modifying pdfgrep to extend the cache lifespan.

## Todo:
- Remove ghost keys from index, the search should not include missing files based on the cached index.
  - Also, I suggest not removing them from the text cache since they can be later used if the file is found again (related to the first point)
- Implement a unifying indexer to hide the use of multiple indexers and unify the search
- Implement the lunr search tool and test its performance
- Try a custom index
- Try an external search engine (?), wouldn't be bad

## Notes
 - The elasticlunr index hit the max callstack while being serialized. I reckon it'd hit it again evantuaally if I just try to increase the limit so that's deprecated.
 - In general, I've discovered that these simple JS search engines are much less powerful than I imagined. Some use too much memory or are not flexible to be used how I wanted and don't allow or ease import/export. I reckon most of them could be useful to search simple stuff like titles and small text and/or few rows (few millions?). Some of them are very flexible in terms of search capabilities and some are very performant (supposedly). But in the end none could do what I wanted so I'll move
