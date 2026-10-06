import BookCard from "./BookCard";
import type { Book } from "../../types/book";
import styles from "./BookGrid.module.css";

interface BookGridProps {
  books: Book[];
}

function BookGrid({ books }: BookGridProps) {
  return (
    <ul className={styles.grid}>
      {books.map((book) => (
        <li className={styles.gridItem} key={book.id}>
          <BookCard book={book} />
        </li>
      ))}
    </ul>
  );
}

export default BookGrid;
