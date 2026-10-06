export interface OpenLibraryBookDocument {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
}

export interface OpenLibrarySearchResponse {
  num_found: number;
  start: number;
  docs: OpenLibraryBookDocument[];
}
