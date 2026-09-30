export interface Book {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  firstPublishYear: number | null;
}
