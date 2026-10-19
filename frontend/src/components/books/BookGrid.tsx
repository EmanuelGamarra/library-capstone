import BookCard from "./BookCard";
import type { Book } from "../../types/book";
import type { Reservation } from "../../types/reservation";
import styles from "./BookGrid.module.css";

interface BookGridProps {
  books: Book[];
  showBorrow?: boolean;
  borrowedIds?: ReadonlySet<string>;
  borrowedStatus?: "loading" | "ready" | "error";
  reservationsByBook?: Readonly<Record<string, Reservation>>;
  onBorrowSuccess?: (openLibraryId: string) => void;
  onReservationSuccess?: (reservation: Reservation) => void;
  onReservationRefresh?: () => void;
}

function BookGrid({
  books,
  showBorrow = false,
  borrowedIds,
  borrowedStatus = "ready",
  reservationsByBook,
  onBorrowSuccess,
  onReservationSuccess,
  onReservationRefresh,
}: BookGridProps) {
  return (
    <ul className={styles.grid}>
      {books.map((book) => (
        <li className={styles.gridItem} key={book.id}>
          <BookCard
            book={book}
            showBorrow={showBorrow}
            alreadyBorrowed={borrowedIds?.has(book.id) ?? false}
            borrowedStatus={borrowedStatus}
            reservation={reservationsByBook?.[book.id]}
            onBorrowSuccess={onBorrowSuccess}
            onReservationSuccess={onReservationSuccess}
            onReservationRefresh={onReservationRefresh}
          />
        </li>
      ))}
    </ul>
  );
}

export default BookGrid;
