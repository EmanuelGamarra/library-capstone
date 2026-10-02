import type { Book } from "../types/book";
import type { BookSearchType, BookSearchParams } from "../types/bookSearch";
import type { OpenLibrarySearchResponse } from "../types/openLibrary";
import { mapOpenLibraryBook } from "../utils/mapOpenLibraryBook";

const OPEN_LIBRARY_URL = "https://openlibrary.org";
const DEFAULT_CATALOG_LIMIT = 12;

const BOOK_FIELDS = "key,title,author_name,cover_i,first_publish_year";

const getSearchParameterName = (
  type: BookSearchType,
): "q" | "title" | "author" => {
  switch (type) {
    case "title":
      return "title";

    case "author":
      return "author";

    case "all":
    default:
      return "q";
  }
};

export const getTrendingBooks = async (): Promise<Book[]> => {
  const params = new URLSearchParams({
    q: "trending_z_score:{0 TO *]",
    sort: "trending",
    fields: "key,title,author_name,cover_i,first_publish_year",
    limit: DEFAULT_CATALOG_LIMIT.toString(),
  });

  const response = await fetch(
    `${OPEN_LIBRARY_URL}/search.json?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch trending books from Open Library");
  }

  const data: OpenLibrarySearchResponse = await response.json();

  return data.docs.map(mapOpenLibraryBook);
};

export const searchBooks = async ({
  query,
  type,
}: BookSearchParams): Promise<Book[]> => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const searchParameter = getSearchParameterName(type);

  const params = new URLSearchParams({
    [searchParameter]: normalizedQuery,
    fields: BOOK_FIELDS,
    limit: DEFAULT_CATALOG_LIMIT.toString(),
  });

  const response = await fetch(
    `${OPEN_LIBRARY_URL}/search.json?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error("Failed to search books in Open Library");
  }

  const data: OpenLibrarySearchResponse = await response.json();

  return data.docs.map(mapOpenLibraryBook);
};
