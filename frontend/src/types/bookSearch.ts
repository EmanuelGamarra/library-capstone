import type { Book } from "./book";

export const BOOK_SEARCH_TYPES = ["all", "title", "author"];

export const BOOK_SORT_VALUES = ["relevance", "newest", "oldest"] as const;

export type BookSearchType = (typeof BOOK_SEARCH_TYPES)[number];

export type BookSort = (typeof BOOK_SORT_VALUES)[number];

export interface BookFilters {
  subject?: string;
  yearFrom?: number;
  yearTo?: number;
}

export interface BookSearchParams {
  query: string;
  type: BookSearchType;
  filters?: BookFilters;
  sort: BookSort;
  page: number;
}

export interface BookSearchResult {
  books: Book[];
  totalResults: number;
}

export const isBookSearchType = (
  value: string | null,
): value is BookSearchType => {
  return BOOK_SEARCH_TYPES.includes(value as BookSearchType);
};

export const isBookSort = (value: string | null): value is BookSort => {
  return BOOK_SORT_VALUES.includes(value as BookSort);
};
