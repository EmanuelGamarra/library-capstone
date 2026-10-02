export const BOOK_SEARCH_TYPES = ["all", "title", "author"];

export type BookSearchType = (typeof BOOK_SEARCH_TYPES)[number];

export interface BookSearchParams {
  query: string;
  type: BookSearchType;
}

export const isBookSearchType = (
  value: string | null,
): value is BookSearchType => {
  return BOOK_SEARCH_TYPES.includes(value as BookSearchType);
};
