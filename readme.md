# Pdf librarian
Tool assembled from a few different packages to quickly search pdfs files
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

## Todo:
- Detect file renames
  - This could be done having a secondary cache key based on the file hash, so that if the file is not directly found based on location, it can be later inferred that it was renamed based on hash. This way it would still be necessary to load the file but not extract the text, which is the slowest part. Also, would be good to use the hash as the indexing key since otherwise renaming a file would require updating the index since the path is used as the indexing key :(
- Remove ghost keys from index, the search should not include missing files based on the cached index.
  - Also, I suggest not removing them from the text cache since they can be later used if the file is found again (related to the first point)
- Implement a unifying indexer to hide the use of multiple indexers and unify the search
- Implement the lunr search tool and test its performance
- Try a custom index
- Try opensearch (?), wouldn't be bad

## Notes
 - The elasticlunr index hit the max callstack while being serialized. I reckon it'd hit it again evantuaally if I just try to increase the limit so that's deprecated
