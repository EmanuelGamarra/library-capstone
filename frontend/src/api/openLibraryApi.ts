import type { Book } from "../types/book";
import type {
  BookSearchType,
  BookSearchParams,
  BookFilters,
  BookSort,
  BookSearchResult,
} from "../types/bookSearch";
import type { OpenLibrarySearchResponse } from "../types/openLibrary";
import {
  mapOpenLibraryBook,
  mapValidOpenLibraryBooks,
} from "../utils/mapOpenLibraryBook";
import type { BookMetadata } from "../types/bookMetadata";
import type { BookDetail } from "../types/bookDetail";
import type {
  OpenLibraryWorkDetail,
  OpenLibraryAuthorDetail,
} from "../types/openLibrary";
import { isOpenLibraryWorkId } from "../utils/openLibraryId";

const OPEN_LIBRARY_URL = "https://openlibrary.org";
const OPEN_LIBRARY_MIN_QUERY_LENGTH = 3;
export const TRENDING_BOOKS_QUERY = "trending_z_score:{0 TO *]";
export const BOOKS_PER_PAGE = 12;
export const MAX_CATALOG_PAGES = 100;

const BOOK_FIELDS = "key,title,author_name,cover_i,first_publish_year";
const MAX_SEARCH_BATCH_SIZE = 1000;
const MAX_SEARCH_REQUESTS = 4;

const hasCompleteCardMetadata = (book: Book): boolean => {
  return (
    book.title.trim().length > 0 &&
    book.authors.some((author) => author.trim().length > 0) &&
    book.coverUrl !== null &&
    book.firstPublishYear !== null
  );
};

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

  if (filters.yearFrom !== undefined || filters.yearTo !== undefined) {
    const from = filters.yearFrom ?? "*";
    const to = filters.yearTo ?? "*";

    clauses.push(`first_publish_year:[${from} TO ${to}]`);
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
  const fetchLimit = Math.min(Math.max(limit * 12, 48), 100);

  const params = new URLSearchParams({
    q: TRENDING_BOOKS_QUERY,
    sort: "trending",
    fields: BOOK_FIELDS,
    limit: fetchLimit.toString(),
  });

  const response = await fetch(
    `${OPEN_LIBRARY_URL}/search.json?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch trending books from Open Library");
  }

  const data: OpenLibrarySearchResponse = await response.json();

  return mapValidOpenLibraryBooks(data.docs)
    .filter(hasCompleteCardMetadata)
    .slice(0, limit);
};

export const getRecentlyAddedBooks = async (
  limit = BOOKS_PER_PAGE,
): Promise<Book[]> => {
  const currentYear = new Date().getFullYear();
  const earliestYear = currentYear - 2;

  const fetchLimit = Math.min(Math.max(limit * 12, 48), 100);

  const params = new URLSearchParams({
    q: `first_publish_year:[${earliestYear} TO ${currentYear}]`,
    sort: "new",
    fields: BOOK_FIELDS,
    limit: fetchLimit.toString(),
  });

  const response = await fetch(
    `${OPEN_LIBRARY_URL}/search.json?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(
      `Unable to load recently added books (HTTP ${response.status})`,
    );
  }

  const data: OpenLibrarySearchResponse = await response.json();

  if (!Array.isArray(data.docs)) {
    throw new Error("Invalid Recently Added response from Open Library");
  }

  return mapValidOpenLibraryBooks(data.docs)
    .filter(hasCompleteCardMetadata)
    .slice(0, limit);
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
  });

  const apiSort = mapSortToOpenLibrary(sort);

  if (apiSort) {
    params.set("sort", apiSort);
  }

  const pageStart = (page - 1) * BOOKS_PER_PAGE;
  const pageEnd = pageStart + BOOKS_PER_PAGE;
  const validBooks: Book[] = [];
  let offset = 0;
  let totalResults = 0;

  for (
    let requestCount = 0;
    requestCount < MAX_SEARCH_REQUESTS && validBooks.length < pageEnd;
    requestCount += 1
  ) {
    const remaining = pageEnd - validBooks.length;
    const requestLimit = Math.min(
      Math.max(remaining + BOOKS_PER_PAGE, BOOKS_PER_PAGE * 2),
      MAX_SEARCH_BATCH_SIZE,
    );

    params.set("limit", requestLimit.toString());
    params.set("offset", offset.toString());

    const response = await fetch(
      `${OPEN_LIBRARY_URL}/search.json?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error("Failed to search books in Open Library");
    }

    const data: OpenLibrarySearchResponse = await response.json();

    totalResults = data.num_found;
    validBooks.push(...mapValidOpenLibraryBooks(data.docs));
    offset += data.docs.length;

    if (data.docs.length === 0 || offset >= totalResults) {
      break;
    }
  }

  return {
    books: validBooks.slice(pageStart, pageEnd),
    totalResults,
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

interface OpenLibraryWork {
  title: string;
  covers?: number[];
  authors?: {
    author: {
      key: string;
    };
  }[];
}

interface OpenLibraryAuthor {
  name: string;
}

const hasAuthors = (book?: Book): boolean => {
  return book?.authors.some((author) => author.trim().length > 0) ?? false;
};

const getBookByExactWorkId = async (
  openLibraryId: string,
  signal?: AbortSignal,
): Promise<Book | null> => {
  const workKey = `/works/${openLibraryId}`;
  const params = new URLSearchParams({
    q: `key:"${workKey}"`,
    fields: BOOK_FIELDS,
    limit: "1",
  });

  const response = await fetch(
    `${OPEN_LIBRARY_URL}/search.json?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    return null;
  }

  const data: OpenLibrarySearchResponse = await response.json();

  if (!Array.isArray(data.docs)) {
    return null;
  }

  const matchingDocument = data.docs.find(
    (document) => document.key === openLibraryId || document.key === workKey,
  );

  return matchingDocument ? mapOpenLibraryBook(matchingDocument) : null;
};

export async function getBookMetadata(
  openLibraryId: string,
): Promise<BookMetadata> {
  if (!isOpenLibraryWorkId(openLibraryId)) {
    throw new Error("Invalid Open Library Work ID.");
  }

  const response = await fetch(
    `${OPEN_LIBRARY_URL}/works/${encodeURIComponent(openLibraryId)}.json`,
  );

  if (!response.ok) {
    throw new Error("Unable to load book metadata");
  }

  const work: OpenLibraryWork = await response.json();
  const coverId = work.covers?.find((id) => id > 0);
  const coverUrl = coverId
    ? `https://covers.openlibrary.org/b/id/${coverId}-S.jpg`
    : null;

  let author: string | null = null;
  const authorKey = work.authors?.[0]?.author?.key;

  if (authorKey) {
    try {
      const authorResponse = await fetch(
        `${OPEN_LIBRARY_URL}${authorKey}.json`,
      );

      if (authorResponse.ok) {
        const authorData: OpenLibraryAuthor = await authorResponse.json();

        author = authorData.name;
      }
    } catch {
      // Author metadata
    }
  }

  return {
    openLibraryId,
    title: work.title,
    author,
    coverUrl,
  };
}

export async function getBookDetails(
  openLibraryId: string,
  signal?: AbortSignal,
  searchMetadata?: Book,
): Promise<BookDetail> {
  if (!isOpenLibraryWorkId(openLibraryId)) {
    throw new Error("Invalid Open Library Work ID.");
  }

  const workResponse = await fetch(
    `${OPEN_LIBRARY_URL}/works/${encodeURIComponent(openLibraryId)}.json`,
    { signal },
  );

  if (workResponse.status === 404) {
    throw new Error("Book not found.");
  }

  if (!workResponse.ok) {
    throw new Error("Unable to load book details.");
  }

  const work: OpenLibraryWorkDetail = await workResponse.json();

  const authorKeys = [
    ...new Set(
      (work.authors ?? [])
        .map((entry) => entry.author?.key)
        .filter((key): key is string => Boolean(key)),
    ),
  ];

  const authorResults = await Promise.allSettled(
    authorKeys.map(async (key) => {
      const response = await fetch(`${OPEN_LIBRARY_URL}${key}.json`, {
        signal,
      });

      if (!response.ok) {
        throw new Error("Unable to load author.");
      }

      const author: OpenLibraryAuthorDetail = await response.json();
      return author.name?.trim() || null;
    }),
  );

  if (signal?.aborted) {
    throw new DOMException("Request aborted", "AbortError");
  }

  const workAuthors = authorResults.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );

  const description =
    typeof work.description === "string"
      ? work.description
      : (work.description?.value ?? null);

  const coverId = work.covers?.find((id) => Number.isInteger(id) && id > 0);

  const yearMatch = work.first_publish_date?.match(
    /\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/,
  );

  const navigationMetadata =
    searchMetadata?.id === openLibraryId ? searchMetadata : undefined;
  const navigationCoverUrl = navigationMetadata?.coverUrl?.trim() || null;
  const navigationYear = navigationMetadata?.firstPublishYear ?? null;

  const needsSearchLookup =
    (workAuthors.length === 0 && !hasAuthors(navigationMetadata)) ||
    (!coverId && !navigationCoverUrl) ||
    (!yearMatch && navigationYear === null);

  let exactSearchMetadata: Book | null = null;

  if (needsSearchLookup) {
    try {
      exactSearchMetadata = await getBookByExactWorkId(openLibraryId, signal);
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
    }
  }

  const fallbackAuthors = hasAuthors(navigationMetadata)
    ? (navigationMetadata?.authors ?? [])
    : (exactSearchMetadata?.authors ?? []);
  const fallbackCoverUrl =
    navigationCoverUrl ?? exactSearchMetadata?.coverUrl ?? null;
  const fallbackYear =
    navigationYear ?? exactSearchMetadata?.firstPublishYear ?? null;
  const authors =
    workAuthors.length > 0
      ? workAuthors
      : fallbackAuthors.filter((author) => author.trim().length > 0);

  return {
    id: openLibraryId,
    title: work.title,
    authors,
    coverUrl: coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      : fallbackCoverUrl,
    description: description?.trim() || null,
    firstPublishYear: yearMatch ? Number(yearMatch[1]) : fallbackYear,
    subjects: Array.isArray(work.subjects)
      ? work.subjects
          .filter((subject): subject is string => typeof subject === "string")
          .slice(0, 6)
      : [],
  };
}
