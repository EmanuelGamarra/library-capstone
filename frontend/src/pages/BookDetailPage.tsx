import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import BookCover from "../components/books/BookCover";
import CatalogState from "../components/common/CatalogState";
import { getBookDetails } from "../api/openLibraryApi";
import type { BookDetail } from "../types/bookDetail";
import { useAuth } from "../hooks/useAuth";
import { useAuthErrorHandler } from "../hooks/useAuthErrorHandler";
import { getMyActiveLoans } from "../api/loanApi";
import { getMyReservations } from "../api/reservationApi";
import type { Reservation } from "../types/reservation";
import BookBorrowActions from "../components/books/BookBorrowActions";
import ReadingTracker from "../components/books/ReadingTracker";
import styles from "./BookDetailPage.module.css";

function BookDetailPage() {
  const location = useLocation();

  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const [readingRefreshKey, setReadingRefreshKey] = useState(0);

  const { token, isAuthenticated } = useAuth();
  const handleAuthError = useAuthErrorHandler();

  const navigationState = location.state as {
    returnTo?: unknown;
  } | null;

  const returnTo =
    typeof navigationState?.returnTo === "string" &&
    (navigationState.returnTo === "/" ||
      navigationState.returnTo.startsWith("/catalog?") ||
      navigationState.returnTo.startsWith("/catalog#") ||
      navigationState.returnTo === "/catalog")
      ? navigationState.returnTo
      : "/catalog";

  const backLabel = returnTo === "/" ? "Back to Home" : "Back to Catalog";

  const [ownership, setOwnership] = useState<{
    token: string;
    bookId: string;
    alreadyBorrowed: boolean;
    reservation?: Reservation;
  } | null>(null);

  const [ownershipError, setOwnershipError] = useState<{
    token: string;
    bookId: string;
  } | null>(null);

  const [ownershipRetryKey, setOwnershipRetryKey] = useState(0);

  useEffect(() => {
    if (!bookId || !/^OL\d+W$/.test(bookId)) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadBook() {
      setIsLoading(true);
      setError("");
      setBook(null);

      try {
        const result = await getBookDetails(bookId!, controller.signal);

        if (!cancelled) {
          setBook(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load book details.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadBook();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [bookId, retryKey]);

  useEffect(() => {
    if (!isAuthenticated || !token || !bookId || !/^OL\d+W$/.test(bookId)) {
      return;
    }

    let cancelled = false;

    async function loadOwnership() {
      setOwnership(null);
      setOwnershipError(null);

      try {
        const [loansResponse, reservationsResponse] = await Promise.all([
          getMyActiveLoans(token!),
          getMyReservations(token!),
        ]);

        if (cancelled) return;

        const alreadyBorrowed = loansResponse.loans.some(
          (loan) => loan.openLibraryId === bookId,
        );

        const reservation = reservationsResponse.reservations.find(
          (item) =>
            item.openLibraryId === bookId &&
            (item.status === "PENDING" || item.status === "READY"),
        );

        setOwnership({
          token: token!,
          bookId: bookId!,
          alreadyBorrowed,
          reservation,
        });

        setOwnershipError(null);
      } catch (error) {
        if (cancelled) return;

        setOwnership(null);

        if (!handleAuthError(error)) {
          setOwnershipError({
            token: token!,
            bookId: bookId!,
          });
        }
      }
    }

    void loadOwnership();

    return () => {
      cancelled = true;
    };
  }, [token, isAuthenticated, bookId, ownershipRetryKey, handleAuthError]);

  const invalidBookId = !bookId || !/^OL\d+W$/.test(bookId);

  function handleBorrowSuccess(openLibraryId: string) {
    setOwnership((current) => {
      if (
        !current ||
        current.token !== token ||
        current.bookId !== openLibraryId
      ) {
        return current;
      }

      return {
        ...current,
        alreadyBorrowed: true,
        reservation: undefined,
      };
    });

    setReadingRefreshKey((value) => value + 1);
  }

  function handleReservationSuccess(reservation: Reservation) {
    setOwnership((current) => {
      if (
        !current ||
        current.token !== token ||
        current.bookId !== reservation.openLibraryId
      ) {
        return current;
      }

      return {
        ...current,
        reservation,
      };
    });
  }

  function refreshOwnership() {
    setOwnership(null);
    setOwnershipRetryKey((value) => value + 1);
  }

  return (
    <main className={styles.page}>
      <Link to={returnTo} className={styles.backLink}>
        <span aria-hidden="true">←</span>
        {backLabel}
      </Link>

      {invalidBookId && (
        <CatalogState
          type="error"
          title="Invalid book"
          message="The requested book identifier is not valid."
        />
      )}

      {!invalidBookId && isLoading && (
        <CatalogState
          type="loading"
          title="Loading book details"
          message="Please wait while we retrieve this book."
        />
      )}

      {!invalidBookId && !isLoading && error && (
        <CatalogState
          type="error"
          title="Unable to display this book"
          message={error}
          actionLabel="Try again"
          onAction={() => setRetryKey((value) => value + 1)}
        />
      )}

      {!invalidBookId && !isLoading && !error && book && (
        <>
          <section className={styles.bookLayout}>
            <div className={styles.coverColumn}>
              <div className={styles.coverWrapper}>
                <BookCover
                  key={book.id}
                  coverUrl={book.coverUrl}
                  title={book.title}
                />
              </div>
            </div>

            <div className={styles.detailsColumn}>
              <header className={styles.bookHeader}>
                <h1 className={styles.title}>{book.title}</h1>
                <p className={styles.authors}>
                  {book.authors.length > 0
                    ? `by ${book.authors.join(", ")}`
                    : "Author unavailable"}
                </p>
              </header>

              <dl className={styles.metadata}>
                <div className={styles.metadataItem}>
                  <dt>First published</dt>
                  <dd>{book.firstPublishYear ?? "Unknown"}</dd>
                </div>

                <div className={styles.metadataItem}>
                  <dt>Subjects</dt>
                  <dd>
                    {book.subjects.length > 0
                      ? book.subjects.slice(0, 2).join(", ")
                      : "Unavailable"}
                  </dd>
                </div>
              </dl>

              <div className={styles.borrowSection}>
                <BookBorrowActions
                  key={`${book.id}:${token ?? "anonymous"}`}
                  openLibraryId={book.id}
                  alreadyBorrowed={
                    ownership?.token === token &&
                    ownership.bookId === book.id &&
                    ownership.alreadyBorrowed
                  }
                  borrowedStatus={
                    !isAuthenticated
                      ? "ready"
                      : ownership?.token === token &&
                          ownership.bookId === book.id
                        ? "ready"
                        : ownershipError?.token === token &&
                            ownershipError.bookId === book.id
                          ? "error"
                          : "loading"
                  }
                  reservation={
                    ownership?.token === token && ownership.bookId === book.id
                      ? ownership.reservation
                      : undefined
                  }
                  onBorrowSuccess={handleBorrowSuccess}
                  onReservationSuccess={handleReservationSuccess}
                  onReservationRefresh={refreshOwnership}
                />

                {isAuthenticated &&
                  ownershipError?.token === token &&
                  ownershipError.bookId === book.id && (
                    <button
                      type="button"
                      className={styles.retryOwnership}
                      onClick={refreshOwnership}
                    >
                      Retry account status
                    </button>
                  )}
              </div>

              <ReadingTracker
                key={`${book.id}:${token ?? "anonymous"}:${readingRefreshKey}`}
                openLibraryId={book.id}
              />

              <button
                type="button"
                className={styles.wishlistPlaceholder}
                disabled
                title="Wishlist functionality is coming soon"
              >
                Add to Wishlist — Coming soon
              </button>
            </div>
          </section>

          <section
            className={styles.descriptionSection}
            aria-labelledby="book-description-heading"
          >
            <h2 id="book-description-heading">Description</h2>

            {book.description ? (
              <p className={styles.description}>{book.description}</p>
            ) : (
              <p className={styles.descriptionUnavailable}>
                No description is available for this book.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default BookDetailPage;
