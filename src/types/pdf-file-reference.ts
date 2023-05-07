export interface PdfFileReference<Content = any> {
  id: string;
  title: string;
  content: Content;
}
