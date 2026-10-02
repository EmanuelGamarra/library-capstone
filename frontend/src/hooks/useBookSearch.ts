import { useState, useEffect } from "react";
import { searchBooks } from "../api/openLibraryApi";
import type { Book } from "../types/book";
import type { BookFilters, BookSearchType } from "../types/bookSearch";

interface UseBookSearchParams {
  query: string;
  type: BookSearchType;
  filters: BookFilters;
}

interface UseBookSearchResult {
  books: Book[];
  isLoading: boolean;
  error: string | null;
}

export const useBookSearch = ({
  query,
  type,
  filters,
}: UseBookSearchParams): UseBookSearchResult => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          filters,
        });

        if (isCurrentRequest) {
          setBooks(results);
        }
      } catch (error) {
        console.error(error);

        if (isCurrentRequest) {
          setBooks([]);
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
  }, [query, type, filters]);

  return {
    books,
    isLoading,
    error,
  };
};
