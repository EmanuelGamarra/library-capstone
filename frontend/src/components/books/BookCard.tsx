import type { Book } from "../../types/book";
import { Link } from "react-router-dom";
import BookCover from "./BookCover";
import BookBorrowActions from "./BookBorrowActions";
import styles from "./BookCard.module.css";

interface BookCardProps {
  book: Book;
  showBorrow?: boolean;
}

function BookCard({ book, showBorrow = false }: BookCardProps) {
  const authorText =
    book.authors.length > 0 ? book.authors.join(", ") : "Unknown author";

  const publicationText = book.firstPublishYear
    ? `First published ${book.firstPublishYear}`
    : "Publication year unavailable";

  return (
    <article className={styles.card}>
      <Link className={styles.cardLink} to={`/books/${book.id}`}>
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

      {showBorrow && <BookBorrowActions openLibraryId={book.id} />}
    </article>
  );
}

export default BookCard;
