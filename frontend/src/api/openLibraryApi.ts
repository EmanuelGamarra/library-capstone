import type { Book } from "../types/book";
import type {
  BookSearchType,
  BookSearchParams,
  BookFilters,
  BookSort,
} from "../types/bookSearch";
import type { OpenLibrarySearchResponse } from "../types/openLibrary";
import { mapOpenLibraryBook } from "../utils/mapOpenLibraryBook";

const OPEN_LIBRARY_URL = "https://openlibrary.org";
const DEFAULT_CATALOG_LIMIT = 12;

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
      return escapedQuery;
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
  filters,
  sort,
}: BookSearchParams): Promise<Book[]> => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const searchQuery = buildSearchQuery({
    query: normalizedQuery,
    type,
    filters,
    sort,
  });

  const params = new URLSearchParams({
    q: searchQuery,
    fields: BOOK_FIELDS,
    limit: DEFAULT_CATALOG_LIMIT.toString(),
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

  return data.docs.map(mapOpenLibraryBook);
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
