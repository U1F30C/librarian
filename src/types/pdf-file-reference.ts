export interface IndexableFileReference<Content = any> {
  id: string;
  title: string;
  content: Content;
  mimeType: string;
}

export type InsertionIndexableFileReference = IndexableFileReference<Buffer>;
export type SearchIndexableFileReference = IndexableFileReference<string>;
