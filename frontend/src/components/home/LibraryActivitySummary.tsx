import { Link } from "react-router-dom";
import type { BookDetail } from "../../types/bookDetail";
import BookCover from "../books/BookCover";
import styles from "./LibraryActivitySummary.module.css";

export interface FeaturedReading {
  openLibraryId: string;
  book: BookDetail | null;
  hasActiveLoan: boolean;
}

export interface DueSoonLoan {
  openLibraryId: string;
  book: BookDetail | null;
  dueAt: string;
  isOverdue: boolean;
}

export interface ActivityStats {
  activeLoans: number | null;
  reservations: number | null;
  wishlist: number | null;
}

interface LibraryActivitySummaryProps {
  reading: FeaturedReading | null;
  dueSoon: DueSoonLoan | null;
  stats: ActivityStats;
  readingLoading?: boolean;
  loansLoading?: boolean;
  statsLoading?: boolean;
  readingError?: boolean;
  loansError?: boolean;
  statsError?: boolean;
  onRetry?: () => void;
}

function LibraryActivitySummary({
  reading,
  dueSoon,
  stats,
  readingLoading = false,
  loansLoading = false,
  statsLoading = false,
  readingError = false,
  loansError = false,
  statsError = false,
  onRetry,
}: LibraryActivitySummaryProps) {
  const readingTitle = reading?.book?.title ?? "Book details unavailable";
  const dueSoonTitle = dueSoon?.book?.title ?? "Book details unavailable";

  return (
    <section
      className={styles.section}
      aria-labelledby="library-activity-heading"
    >
      <h2 id="library-activity-heading" className={styles.sectionTitle}>
        My Reading / Quick Summary
      </h2>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>
            {reading?.hasActiveLoan === false
              ? "Last Read"
              : "Currently Reading"}
          </h3>

          {readingLoading ? (
            <p className={styles.muted} role="status">
              Loading reading activity...
            </p>
          ) : readingError ? (
            <div className={styles.errorState} role="alert">
              <p>Unable to load reading activity.</p>
              <button type="button" onClick={onRetry}>
                Try again
              </button>
            </div>
          ) : reading ? (
            <Link
              className={styles.bookLink}
              to={`/books/${reading.openLibraryId}`}
              state={{ returnTo: "/" }}
            >
              <div className={styles.cover}>
                <BookCover
                  coverUrl={reading.book?.coverUrl ?? null}
                  title={readingTitle}
                />
              </div>

              <div className={styles.bookInfo}>
                <strong>{readingTitle}</strong>
                <span>
                  {reading.book?.authors.join(", ") || "Author unavailable"}
                </span>
                <span className={styles.muted}>
                  {reading.hasActiveLoan ? "Reading" : "Previously borrowed"}
                </span>
              </div>
            </Link>
          ) : (
            <div className={styles.empty}>
              <p>No books currently marked as Reading.</p>
              <Link to="/loans">View My Loans</Link>
            </div>
          )}
        </article>

        <article className={styles.card}>
          <h3>Due Soon</h3>

          {loansLoading ? (
            <p className={styles.muted} role="status">
              Checking due dates...
            </p>
          ) : loansError ? (
            <div className={styles.errorState} role="alert">
              <p>Unable to load loan information.</p>
              <button type="button" onClick={onRetry}>
                Try again
              </button>
            </div>
          ) : dueSoon ? (
            <>
              <Link className={styles.bookLink} to="/loans">
                <div className={styles.cover}>
                  <BookCover
                    coverUrl={dueSoon.book?.coverUrl ?? null}
                    title={dueSoonTitle}
                  />
                </div>

                <div className={styles.bookInfo}>
                  <strong>{dueSoonTitle}</strong>
                  <span>
                    Due {new Date(dueSoon.dueAt).toLocaleDateString()}
                  </span>
                  <span
                    className={
                      dueSoon.isOverdue ? styles.overdue : styles.dueSoon
                    }
                  >
                    {dueSoon.isOverdue ? "Overdue" : "Due soon"}
                  </span>
                </div>
              </Link>
            </>
          ) : (
            <div className={styles.empty}>
              <p>No loans due soon.</p>
              <Link to="/loans">View My Loans</Link>
            </div>
          )}
        </article>

        <article className={styles.card}>
          <h3>My Stats</h3>

          {statsLoading ? (
            <p className={styles.muted} role="status">
              Loading your statistics...
            </p>
          ) : (
            <div className={styles.stats}>
              <Link to="/loans" className={styles.stat}>
                <strong>{stats.activeLoans ?? "—"}</strong>
                <span>Active Loans</span>
              </Link>

              <Link to="/reservations" className={styles.stat}>
                <strong>{stats.reservations ?? "—"}</strong>
                <span>Reservations</span>
              </Link>

              <Link to="/wishlist" className={styles.stat}>
                <strong>{stats.wishlist ?? "—"}</strong>
                <span>Wishlist</span>
              </Link>
            </div>
          )}

          {statsError && !statsLoading && (
            <div className={styles.errorState} role="alert">
              <p>Some statistics could not be loaded.</p>
              <button type="button" onClick={onRetry}>
                Try again
              </button>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

export default LibraryActivitySummary;
