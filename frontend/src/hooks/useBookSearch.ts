import { useState, useEffect, useCallback } from "react";
import { searchBooks } from "../api/openLibraryApi";
import type { Book } from "../types/book";
import type {
  BookFilters,
  BookSearchType,
  BookSort,
} from "../types/bookSearch";

interface UseBookSearchParams {
  query: string;
  type: BookSearchType;
  filters: BookFilters;
  sort: BookSort;
  page: number;
}

interface UseBookSearchResult {
  books: Book[];
  totalResults: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useBookSearch = ({
  query,
  type,
  filters,
  sort,
  page,
}: UseBookSearchParams): UseBookSearchResult => {
  const [books, setBooks] = useState<Book[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const { subject, yearFrom, yearTo } = filters;

  useEffect(() => {
    if (!query) {
      return;
    }

    let isCurrentRequest = true;

    const loadBooks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const results = await searchBooks({
          query,
          type,
          filters: {
            subject,
            yearFrom,
            yearTo,
          },
          sort,
          page,
        });

        if (isCurrentRequest) {
          setBooks(results.books);
          setTotalResults(results.totalResults);
        }
      } catch (error) {
        console.error(error);

        if (isCurrentRequest) {
          setBooks([]);
          setTotalResults(0);
          setError("Unable to search books. Please try again later.");
        }
      } finally {
        if (isCurrentRequest) {
          setIsLoading(false);
        }
      }
    };

    loadBooks();

    return () => {
      isCurrentRequest = false;
    };
  }, [query, type, subject, yearFrom, yearTo, sort, page, retryCount]);

  const refetch = useCallback(() => {
    setRetryCount((current) => current + 1);
  }, []);

  return {
    books,
    totalResults,
    isLoading,
    error,
    refetch,
  };
};
