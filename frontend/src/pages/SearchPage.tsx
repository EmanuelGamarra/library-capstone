import { useSearchParams } from "react-router-dom";
import BookGrid from "../components/books/BookGrid";
import SearchBar from "../components/search/SearchBar";
import {
  isBookSearchType,
  type BookFilters,
  type BookSearchType,
} from "../types/bookSearch";
import styles from "./SearchPage.module.css";
import { useBookSearch } from "../hooks/useBookSearch";
import FilterPanel from "../components/search/FilterPanel";
import {
  getBookFiltersFromSearchParams,
  hasActiveBookFilters,
} from "../utils/bookSearchParams";
import { useMemo } from "react";

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const typeParam = searchParams.get("type");

  const searchType: BookSearchType = isBookSearchType(typeParam)
    ? typeParam
    : "all";

  const filters = useMemo(
    () => getBookFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  const { books, isLoading, error } = useBookSearch({
    query,
    type: searchType,
    filters,
  });

  const handleSearch = (newQuery: string, newType: BookSearchType) => {
    const nextParams = new URLSearchParams(searchParams);

    nextParams.set("q", newQuery);
    nextParams.set("type", newType);

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

    setSearchParams(nextParams);
  };

  const handleClearFilters = () => {
    const nextParams = new URLSearchParams(searchParams);

    nextParams.delete("subject");
    nextParams.delete("yearFrom");
    nextParams.delete("yearTo");

    setSearchParams(nextParams);
  };

  const displayedBooks = query ? books : [];

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Search Books</h1>

          <p className={styles.subtitle}>
            Search by title, author, or keywords.
          </p>
        </div>

        <SearchBar
          initialQuery={query}
          initialType={searchType}
          onSearch={handleSearch}
        />

        <FilterPanel
          key={searchParams.toString()}
          initialFilters={filters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />

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

      {query && (
        <section
          className={styles.resultsSection}
          aria-labelledby="search-results-heading"
        >
          <h2 id="search-results-heading" className={styles.resultsTitle}>
            Results for “{query}”
          </h2>

          {isLoading && (
            <p className={styles.statusMessage}>Searching books...</p>
          )}

          {!isLoading && error && (
            <p className={styles.statusMessage}>{error}</p>
          )}

          {!isLoading && !error && displayedBooks.length === 0 && (
            <p className={styles.statusMessage}>No books found.</p>
          )}

          {!isLoading && !error && displayedBooks.length > 0 && (
            <BookGrid books={displayedBooks} />
          )}
        </section>
      )}
    </main>
  );
}

export default SearchPage;
