import BookCard from "./BookCard";
import type { Book } from "../../types/book";
import styles from "./BookGrid.module.css";

interface BookGridProps {
  books: Book[];
  showBorrow?: boolean;
  borrowedIds?: ReadonlySet<string>;
  borrowedStatus?: "loading" | "ready" | "error";
  onBorrowSuccess?: (openLibraryId: string) => void;
}

function BookGrid({
  books,
  showBorrow = false,
  borrowedIds,
  borrowedStatus = "ready",
  onBorrowSuccess,
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
            onBorrowSuccess={onBorrowSuccess}
          />
        </li>
      ))}
    </ul>
  );
}

export default BookGrid;
