export interface BookDetail {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  description: string | null;
  firstPublishYear: number | null;
  subjects: string[];
}
