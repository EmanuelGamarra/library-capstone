import { useEffect, useState } from "react";
import { getTrendingBooks } from "../api/openLibraryApi";
import BookGrid from "../components/books/BookGrid";
import type { Book } from "../types/book";
import styles from "./HomePage.module.css";
import { useNavigate } from "react-router-dom";
import type { BookSearchType } from "../types/bookSearch";
import SearchBar from "../components/search/SearchBar";
import CatalogState from "../components/common/CatalogState";

function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSearch = (query: string, type: BookSearchType) => {
    const params = new URLSearchParams({
      q: query,
      type,
    });

    navigate(`/catalog?${params.toString()}`);
  };

  useEffect(() => {
    const loadTrendingBooks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const trendingBooks = await getTrendingBooks();

        setBooks(trendingBooks);
      } catch (error) {
        console.error(error);

        setError("Unable to load books. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTrendingBooks();
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>Explore Books</h1>

        <p className={styles.subtitle}>Discover your next book.</p>

        <div className={styles.searchArea}>
          <SearchBar onSearch={handleSearch} />
        </div>
      </header>

      <section
        className={styles.catalogSection}
        aria-labelledby="trending-books-heading"
      >
        <h2 id="trending-books-heading" className={styles.sectionTitle}>
          Trending Books
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
            message="Please try again later."
          />
        )}

        {!isLoading && !error && books.length === 0 && (
          <CatalogState
            type="empty"
            title="No books available"
            message="There are no trending books to display right now."
          />
        )}

        {!isLoading && !error && books.length > 0 && <BookGrid books={books} />}
      </section>
    </main>
  );
}

export default HomePage;
