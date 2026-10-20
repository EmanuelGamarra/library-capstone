import { Link } from "react-router-dom";
import BookCover from "../books/BookCover";
import BookBorrowActions from "../books/BookBorrowActions";
import type { BookDetail } from "../../types/bookDetail";
import type { Reservation } from "../../types/reservation";
import styles from "./WishlistBookCard.module.css";

interface WishlistBookCardProps {
  openLibraryId: string;
  book: BookDetail | null | undefined;
  alreadyBorrowed: boolean;
  borrowedStatus: "loading" | "ready" | "error";
  reservation?: Reservation;
  isRemoving: boolean;
  removeError?: string;
  onRemove: (openLibraryId: string) => void;
  onBorrowSuccess: (openLibraryId: string) => void;
  onReservationSuccess: (reservation: Reservation) => void;
  onReservationRefresh: () => void;
}

function WishlistBookCard({
  openLibraryId,
  book,
  alreadyBorrowed,
  borrowedStatus,
  reservation,
  isRemoving,
  removeError,
  onRemove,
  onBorrowSuccess,
  onReservationSuccess,
  onReservationRefresh,
}: WishlistBookCardProps) {
  const isMetadataLoading = book === undefined;
  const title =
    book?.title ??
    (isMetadataLoading ? "Loading book..." : "Book details unavailable");

  const authors =
    book && book.authors.length > 0
      ? book.authors.join(", ")
      : "Author unavailable";

  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.removeButton}
        aria-label={`Remove ${title} from wishlist`}
        title="Remove from wishlist"
        disabled={isRemoving}
        onClick={() => onRemove(openLibraryId)}
      >
        <span aria-hidden="true">×</span>
      </button>

      <Link
        to={`/books/${openLibraryId}`}
        state={{ returnTo: "/wishlist", searchMetadata: book ?? undefined }}
        className={styles.bookLink}
      >
        <div className={styles.coverWrapper}>
          <BookCover coverUrl={book?.coverUrl ?? null} title={title} />
        </div>

        <div className={styles.bookInfo}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.author}>{authors}</p>

          {book === null && (
            <p className={styles.metadataNotice}>
              Bibliographic details could not be loaded.
            </p>
          )}
        </div>
      </Link>

      <div className={styles.actions}>
        <BookBorrowActions
          openLibraryId={openLibraryId}
          alreadyBorrowed={alreadyBorrowed}
          borrowedStatus={borrowedStatus}
          reservation={reservation}
          onBorrowSuccess={onBorrowSuccess}
          onReservationSuccess={onReservationSuccess}
          onReservationRefresh={onReservationRefresh}
        />
      </div>

      {isRemoving && (
        <p className={styles.status} role="status">
          Removing book...
        </p>
      )}

      {removeError && (
        <p className={styles.error} role="alert">
          {removeError}
        </p>
      )}
    </article>
  );
}

export default WishlistBookCard;
