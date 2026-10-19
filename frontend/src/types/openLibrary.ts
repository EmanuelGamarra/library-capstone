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

export interface OpenLibraryWorkAuthor {
  author?: {
    key: string;
  };
}

export interface OpenLibraryWorkDetail {
  title: string;
  description?: string | { value: string };
  covers?: number[];
  authors?: OpenLibraryWorkAuthor[];
  first_publish_date?: string;
  subjects?: string[];
}

export interface OpenLibraryAuthorDetail {
  name?: string;
}
