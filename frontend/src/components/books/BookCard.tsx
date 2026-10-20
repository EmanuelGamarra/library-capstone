import type { Book } from "../../types/book";
import type { Reservation } from "../../types/reservation";
import { Link, useLocation } from "react-router-dom";
import BookCover from "./BookCover";
import BookBorrowActions from "./BookBorrowActions";
import styles from "./BookCard.module.css";

interface BookCardProps {
  book: Book;
  showBorrow?: boolean;
  alreadyBorrowed?: boolean;
  borrowedStatus?: "loading" | "ready" | "error";
  reservation?: Reservation;
  onBorrowSuccess?: (openLibraryId: string) => void;
  onReservationSuccess?: (reservation: Reservation) => void;
  onReservationRefresh?: () => void;
}

function BookCard({
  book,
  showBorrow = false,
  alreadyBorrowed = false,
  borrowedStatus = "ready",
  reservation,
  onBorrowSuccess,
  onReservationSuccess,
  onReservationRefresh,
}: BookCardProps) {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const authorText =
    book.authors.length > 0 ? book.authors.join(", ") : "Unknown author";

  const publicationText = book.firstPublishYear
    ? `First published ${book.firstPublishYear}`
    : "Publication year unavailable";

  return (
    <article className={styles.card}>
      <Link
        className={styles.cardLink}
        to={`/books/${book.id}`}
        state={{ returnTo, searchMetadata: book }}
      >
        <div className={styles.coverWrapper}>
          <BookCover coverUrl={book.coverUrl} title={book.title} />
        </div>

        <div className={styles.bookInfo}>
          <h3 className={styles.bookTitle}>{book.title}</h3>
          <p className={styles.authors} title={authorText}>
            {authorText}
          </p>
          <p className={styles.publicationYear}>{publicationText}</p>
        </div>
      </Link>

      {showBorrow && (
        <BookBorrowActions
          openLibraryId={book.id}
          alreadyBorrowed={alreadyBorrowed}
          borrowedStatus={borrowedStatus}
          reservation={reservation}
          onBorrowSuccess={onBorrowSuccess}
          onReservationSuccess={onReservationSuccess}
          onReservationRefresh={onReservationRefresh}
        />
      )}
    </article>
  );
}

export default BookCard;
