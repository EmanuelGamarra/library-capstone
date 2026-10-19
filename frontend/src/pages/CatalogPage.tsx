import { useSearchParams } from "react-router-dom";
import BookGrid from "../components/books/BookGrid";
import SearchBar from "../components/search/SearchBar";
import {
  isBookSearchType,
  type BookFilters,
  type BookSearchType,
  type BookSort,
} from "../types/bookSearch";
import { useBookSearch } from "../hooks/useBookSearch";
import FilterPanel from "../components/search/FilterPanel";
import {
  getBookFiltersFromSearchParams,
  hasActiveBookFilters,
  parseBookSort,
  parsePageParam,
} from "../utils/bookSearchParams";
import { useEffect, useMemo, useRef, useState } from "react";
import SortSelect from "../components/search/SortSelect";
import {
  BOOKS_PER_PAGE,
  MAX_CATALOG_PAGES,
  TRENDING_BOOKS_QUERY,
} from "../api/openLibraryApi";
import { getMyActiveLoans } from "../api/loanApi";
import Pagination from "../components/search/Pagination";
import CatalogState from "../components/common/CatalogState";
import { useAuth } from "../hooks/useAuth";
import { useAuthErrorHandler } from "../hooks/useAuthErrorHandler";
import { getMyReservations } from "../api/reservationApi";
import type { Reservation } from "../types/reservation";
import styles from "./CatalogPage.module.css";

function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { token, isAuthenticated } = useAuth();
  const handleAuthError = useAuthErrorHandler();
  const [borrowedIds, setBorrowedIds] = useState<Set<string>>(new Set());
  const [borrowedState, setBorrowedStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [borrowedSessionToken, setBorrowedSessionToken] = useState<
    string | null
  >(null);
  const [borrowedReloadKey, setBorrowedReloadKey] = useState(0);

  const [reservationsByBook, setReservationsByBook] = useState<
    Record<string, Reservation>
  >({});

  const query = searchParams.get("q")?.trim() ?? "";
  const effectiveQuery = query || TRENDING_BOOKS_QUERY;
  const typeParam = searchParams.get("type");

  const searchType: BookSearchType =
    query && isBookSearchType(typeParam) ? typeParam : "all";

  const filters = useMemo(
    () => getBookFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  const sort = parseBookSort(searchParams.get("sort"));

  const page = parsePageParam(searchParams.get("page"));

  const { books, totalResults, isLoading, error, refetch } = useBookSearch({
    query: effectiveQuery,
    type: searchType,
    filters,
    sort,
    page,
  });

  const actualTotalPages =
    totalResults > 0 ? Math.ceil(totalResults / BOOKS_PER_PAGE) : 0;

  const totalPages = Math.min(actualTotalPages, MAX_CATALOG_PAGES);

  const resultsRef = useRef<HTMLElement>(null);

  const handleSearch = (newQuery: string, newType: BookSearchType) => {
    const nextParams = new URLSearchParams(searchParams);

    nextParams.set("q", newQuery);
    nextParams.set("type", newType);

    nextParams.delete("page");

    setSearchParams(nextParams);
  };

  const handleApplyFilters = (newFilters: BookFilters) => {
    const nextParams = new URLSearchParams(searchParams);

    if (newFilters.subject) {
      nextParams.set("subject", newFilters.subject);
    } else {
      nextParams.delete("subject");
    }

    if (newFilters.yearFrom !== undefined) {
      nextParams.set("yearFrom", newFilters.yearFrom.toString());
    } else {
      nextParams.delete("yearFrom");
    }

    if (newFilters.yearTo !== undefined) {
      nextParams.set("yearTo", newFilters.yearTo.toString());
    } else {
      nextParams.delete("yearTo");
    }

    nextParams.delete("page");

    setSearchParams(nextParams);
  };

  const handleClearFilters = () => {
    const nextParams = new URLSearchParams(searchParams);

    nextParams.delete("subject");
    nextParams.delete("yearFrom");
    nextParams.delete("yearTo");

    nextParams.delete("page");

    setSearchParams(nextParams);
  };

  const handleSortChange = (newSort: BookSort) => {
    const nextParams = new URLSearchParams(searchParams);

    if (newSort === "relevance") {
      nextParams.delete("sort");
    } else {
      nextParams.set("sort", newSort);
    }

    nextParams.delete("page");

    setSearchParams(nextParams);
  };

  const handlePageChange = (newPage: number) => {
    const nextParams = new URLSearchParams(searchParams);

    if (newPage <= 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", newPage.toString());
    }

    setSearchParams(nextParams);

    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  function retryBorrowedBooks() {
    setBorrowedStatus("loading");
    setBorrowedReloadKey((value) => value + 1);
  }

  function handleBorrowSuccess(openLibraryId: string) {
    setBorrowedIds((current) => {
      const next = new Set(current);
      next.add(openLibraryId);
      return next;
    });

    setReservationsByBook((current) => {
      const next = { ...current };
      delete next[openLibraryId];
      return next;
    });
  }

  function handleReservationSuccess(reservation: Reservation) {
    setReservationsByBook((previous) => ({
      ...previous,
      [reservation.openLibraryId]: reservation,
    }));
  }

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    let cancelled = false;

    async function loadBorrowedBooks() {
      setBorrowedStatus("loading");

      try {
        const [loansResponse, reservationsResponse] = await Promise.all([
          getMyActiveLoans(token!),
          getMyReservations(token!),
        ]);

        if (cancelled) {
          return;
        }

        const activeBookIds = new Set(
          loansResponse.loans
            .map((loan) => loan.openLibraryId)
            .filter((id): id is string => Boolean(id)),
        );

        const activeReservations: Record<string, Reservation> = {};

        for (const reservation of reservationsResponse.reservations) {
          if (
            reservation.status === "PENDING" ||
            reservation.status === "READY"
          ) {
            activeReservations[reservation.openLibraryId] = reservation;
          }
        }

        setBorrowedIds(activeBookIds);
        setReservationsByBook(activeReservations);
        setBorrowedSessionToken(token);
        setBorrowedStatus("ready");
      } catch (err) {
        if (!cancelled && !handleAuthError(err)) {
          setBorrowedStatus("error");
        }
      }
    }

    void loadBorrowedBooks();

    return () => {
      cancelled = true;
    };
  }, [token, isAuthenticated, borrowedReloadKey, handleAuthError]);

  useEffect(() => {
    if (isLoading || totalPages === 0) {
      return;
    }

    if (page > totalPages) {
      const nextParams = new URLSearchParams(searchParams);

      if (totalPages === 1) {
        nextParams.delete("page");
      } else {
        nextParams.set("page", totalPages.toString());
      }

      setSearchParams(nextParams, { replace: true });
    }
  }, [page, totalPages, isLoading, searchParams, setSearchParams]);

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.titleGroup}>
          <h1>Catalog</h1>

          <p>Browse, search, and discover books in the library.</p>
        </div>

        <SearchBar
          initialQuery={query}
          initialType={searchType}
          onSearch={handleSearch}
        />

        <div className={styles.controlsRow}>
          <FilterPanel
            key={searchParams.toString()}
            initialFilters={filters}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
          />

          <section
            className={styles.sortPanel}
            aria-labelledby="sort-panel-heading"
          >
            <div>
              <h2 id="sort-panel-heading" className={styles.sortTitle}>
                Sort results
              </h2>
              <p className={styles.sortDescription}>
                Choose how books are ordered.
              </p>
            </div>

            <SortSelect value={sort} onChange={handleSortChange} />
          </section>
        </div>

        {hasActiveBookFilters(filters) && (
          <div className={styles.activeFiltersContainer}>
            <span className={styles.activeFiltersLabel}>Active filters:</span>
            <div className={styles.activeFiltersList}>
              {filters.subject && (
                <span className={styles.filterChip}>
                  Category: <strong>{filters.subject}</strong>
                </span>
              )}
              {filters.yearFrom !== undefined && (
                <span className={styles.filterChip}>
                  From: <strong>{filters.yearFrom}</strong>
                </span>
              )}
              {filters.yearTo !== undefined && (
                <span className={styles.filterChip}>
                  To: <strong>{filters.yearTo}</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      <section
        ref={resultsRef}
        className={styles.resultsSection}
        aria-labelledby="catalog-results-heading"
      >
        <h2 id="catalog-results-heading" className={styles.resultsTitle}>
          {query ? `Results for “${query}”` : "Browse Books"}
        </h2>

        {isLoading && (
          <CatalogState
            type="loading"
            title="Loading books"
            message="Please wait while we retrieve the catalog."
          />
        )}

        {!isLoading && error && (
          <CatalogState
            type="error"
            title="We couldn't load the books"
            message="Something went wrong while retrieving the catalog."
            actionLabel="Try again"
            onAction={refetch}
          />
        )}

        {!isLoading && !error && books.length === 0 && (
          <CatalogState
            type="empty"
            title="No books found"
            message={
              hasActiveBookFilters(filters)
                ? "Try changing or clearing your filters."
                : "Try a different search term."
            }
            actionLabel={
              hasActiveBookFilters(filters) ? "Clear filters" : undefined
            }
            onAction={
              hasActiveBookFilters(filters) ? handleClearFilters : undefined
            }
          />
        )}

        {!isLoading && !error && books.length > 0 && (
          <>
            {isAuthenticated && borrowedState === "error" && (
              <div role="alert">
                <p>We couldn't verify your loans and reservations.</p>
                <button type="button" onClick={retryBorrowedBooks}>
                  Retry
                </button>
              </div>
            )}

            <BookGrid
              books={books}
              showBorrow
              borrowedIds={
                isAuthenticated && borrowedSessionToken === token
                  ? borrowedIds
                  : undefined
              }
              borrowedStatus={
                isAuthenticated && borrowedSessionToken !== token
                  ? "loading"
                  : isAuthenticated
                    ? borrowedState
                    : "ready"
              }
              reservationsByBook={
                isAuthenticated && borrowedSessionToken === token
                  ? reservationsByBook
                  : {}
              }
              onBorrowSuccess={handleBorrowSuccess}
              onReservationSuccess={handleReservationSuccess}
              onReservationRefresh={retryBorrowedBooks}
            />

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />

            {actualTotalPages > MAX_CATALOG_PAGES && (
              <p className={styles.paginationHint}>
                Showing the first {MAX_CATALOG_PAGES} pages. Refine your search
                or filters to narrow the results.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default CatalogPage;
