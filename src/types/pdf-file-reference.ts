export interface IndexableFileReference<Content = any> {
  id: string;
  title: string;
  content: Content;
  mimeType?: string;
}
