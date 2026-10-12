import type { Book } from "../types/book";
import type {
  BookSearchType,
  BookSearchParams,
  BookFilters,
  BookSort,
  BookSearchResult,
} from "../types/bookSearch";
import type { OpenLibrarySearchResponse } from "../types/openLibrary";
import { mapOpenLibraryBook } from "../utils/mapOpenLibraryBook";

const OPEN_LIBRARY_URL = "https://openlibrary.org";
const OPEN_LIBRARY_MIN_QUERY_LENGTH = 3;
export const TRENDING_BOOKS_QUERY = "trending_z_score:{0 TO *]";
export const BOOKS_PER_PAGE = 12;
export const MAX_CATALOG_PAGES = 100;

const BOOK_FIELDS = "key,title,author_name,cover_i,first_publish_year";

const escapeQueryValue = (value: string): string => {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
};

const buildTextQuery = (query: string, type: BookSearchType): string => {
  const escapedQuery = escapeQueryValue(query);

  switch (type) {
    case "title":
      return `title:"${escapedQuery}"`;

    case "author":
      return `author:"${escapedQuery}"`;

    case "all":
    default:
      return escapedQuery.length < OPEN_LIBRARY_MIN_QUERY_LENGTH
        ? `(${escapedQuery})`
        : escapedQuery;
  }
};

const buildFilterClauses = (filters?: BookFilters): string[] => {
  if (!filters) {
    return [];
  }

  const clauses: string[] = [];

  if (filters.subject) {
    const escapedSubject = escapeQueryValue(filters.subject);
    clauses.push(`subject:"${escapedSubject}"`);
  }

  if (filters.yearFrom !== undefined && filters.yearTo !== undefined) {
    const form = filters.yearFrom ?? "*";
    const to = filters.yearTo ?? "*";
    clauses.push(`first_publish_year:[${form} TO ${to}]`);
  }

  return clauses;
};

const buildSearchQuery = ({
  query,
  type,
  filters,
}: BookSearchParams): string => {
  const textQuery = buildTextQuery(query, type);
  const filterClauses = buildFilterClauses(filters);

  return [textQuery, ...filterClauses].join(" AND ");
};

export const getTrendingBooks = async (
  limit = BOOKS_PER_PAGE,
): Promise<Book[]> => {
  const params = new URLSearchParams({
    q: TRENDING_BOOKS_QUERY,
    sort: "trending",
    fields: BOOK_FIELDS,
    limit: limit.toString(),
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

export const getRecentlyAddedBooks = async (
  limit = BOOKS_PER_PAGE,
): Promise<Book[]> => {
  const params = new URLSearchParams({
    q: "*:*",
    sort: "new",
    fields: BOOK_FIELDS,
    limit: limit.toString(),
  });

  const response = await fetch(
    `${OPEN_LIBRARY_URL}/search.json?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch recently added books from Open Library");
  }

  const data: OpenLibrarySearchResponse = await response.json();

  return data.docs.map(mapOpenLibraryBook);
};

export const searchBooks = async ({
  query,
  type,
  filters,
  sort,
  page,
}: BookSearchParams): Promise<BookSearchResult> => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return {
      books: [],
      totalResults: 0,
    };
  }

  const searchQuery = buildSearchQuery({
    query: normalizedQuery,
    type,
    filters,
    sort,
    page,
  });

  const params = new URLSearchParams({
    q: searchQuery,
    fields: BOOK_FIELDS,
    limit: BOOKS_PER_PAGE.toString(),
    page: page.toString(),
  });

  const apiSort = mapSortToOpenLibrary(sort);

  if (apiSort) {
    params.set("sort", apiSort);
  }

  const response = await fetch(
    `${OPEN_LIBRARY_URL}/search.json?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error("Failed to search books in Open Library");
  }

  const data: OpenLibrarySearchResponse = await response.json();

  return {
    books: data.docs.map(mapOpenLibraryBook),
    totalResults: data.num_found,
  };
};

const mapSortToOpenLibrary = (sort: BookSort): string | undefined => {
  switch (sort) {
    case "newest":
      return "new";
    case "oldest":
      return "old";
    case "relevance":
    default:
      return undefined;
  }
};
