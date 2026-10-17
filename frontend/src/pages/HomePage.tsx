import { useEffect, useState } from "react";
import { getRecentlyAddedBooks, getTrendingBooks } from "../api/openLibraryApi";
import BookGrid from "../components/books/BookGrid";
import type { Book } from "../types/book";
import styles from "./HomePage.module.css";
import CatalogState from "../components/common/CatalogState";
import homeDiscoveryHero from "../assets/home-discovery-hero.webp";
import { Link } from "react-router-dom";

const HOME_SECTION_BOOK_LIMIT = 4;

function HomePage() {
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);

  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const [isRecentLoading, setIsRecentLoading] = useState(true);

  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrendingBooks = async () => {
      try {
        setIsTrendingLoading(true);
        setTrendingError(null);

        const books = await getTrendingBooks(HOME_SECTION_BOOK_LIMIT);

        setTrendingBooks(books);
      } catch (error) {
        console.error(error);

        setTrendingError("Unable to load trending books.");
      } finally {
        setIsTrendingLoading(false);
      }
    };

    const loadRecentBooks = async () => {
      try {
        setIsRecentLoading(true);
        setRecentError(null);

        const books = await getRecentlyAddedBooks(HOME_SECTION_BOOK_LIMIT);

        setRecentBooks(books);
      } catch (error) {
        console.error(error);

        setRecentError("Unable to load recently added books.");
      } finally {
        setIsRecentLoading(false);
      }
    };

    loadTrendingBooks();
    loadRecentBooks();
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-discovery-heading">
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>University Library</p>

          <h1 id="home-discovery-heading" className={styles.heroTitle}>
            Welcome back
          </h1>

          <p className={styles.heroSubtitle}>Discover your next read.</p>

          <p className={styles.heroDescription}>
            Explore new stories, fresh perspectives, and timeless books selected
            from across the catalog.
          </p>
        </div>

        <div className={styles.heroImageWrapper}>
          <img className={styles.heroImage} src={homeDiscoveryHero} alt="" />
        </div>
      </section>

      <section
        className={styles.bookSection}
        aria-labelledby="trending-books-heading"
      >
        <div className={styles.sectionHeader}>
          <h2 id="trending-books-heading" className={styles.sectionTitle}>
            Trending Books
          </h2>

          <Link className={styles.viewAllLink} to="/catalog">
            View all <span aria-hidden="true">→</span>
          </Link>
        </div>

        {isTrendingLoading && (
          <CatalogState
            type="loading"
            title="Loading trending books"
            message="Please wait while we find popular books."
          />
        )}

        {!isTrendingLoading && trendingError && (
          <CatalogState
            type="error"
            title="We couldn't load trending books"
            message="Please try again later."
          />
        )}

        {!isTrendingLoading && !trendingError && trendingBooks.length === 0 && (
          <CatalogState
            type="empty"
            title="No trending books available"
            message="There are no trending books to display right now."
          />
        )}

        {!isTrendingLoading && !trendingError && trendingBooks.length > 0 && (
          <BookGrid books={trendingBooks} />
        )}
      </section>

      <section
        className={styles.bookSection}
        aria-labelledby="recent-books-heading"
      >
        <div className={styles.sectionHeader}>
          <h2 id="recent-books-heading" className={styles.sectionTitle}>
            Recently Added
          </h2>

          <Link className={styles.viewAllLink} to="/catalog?sort=newest">
            View all <span aria-hidden="true">→</span>
          </Link>
        </div>

        {isRecentLoading && (
          <CatalogState
            type="loading"
            title="Loading recently added books"
            message="Please wait while we retrieve recent additions."
          />
        )}

        {!isRecentLoading && recentError && (
          <CatalogState
            type="error"
            title="We couldn't load recently added books"
            message="Please try again later."
          />
        )}

        {!isRecentLoading && !recentError && recentBooks.length === 0 && (
          <CatalogState
            type="empty"
            title="No recently added books available"
            message="There are no recent additions to display right now."
          />
        )}

        {!isRecentLoading && !recentError && recentBooks.length > 0 && (
          <BookGrid books={recentBooks} />
        )}
      </section>
    </main>
  );
}

export default HomePage;
