import { useSearchParams } from "react-router-dom";
import BookGrid from "../components/books/BookGrid";
import SearchBar from "../components/search/SearchBar";
import { isBookSearchType, type BookSearchType } from "../types/bookSearch";
import styles from "./SearchPage.module.css";
import { useBookSearch } from "../hooks/useBookSearch";

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const typeParam = searchParams.get("type");

  const searchType: BookSearchType = isBookSearchType(typeParam)
    ? typeParam
    : "all";

  const { books, isLoading, error } = useBookSearch({
    query,
    type: searchType,
  });

  const handleSearch = (newQuery: string, newType: BookSearchType) => {
    setSearchParams({
      q: newQuery,
      type: newType,
    });
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
