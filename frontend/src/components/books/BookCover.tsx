import styles from "./BookCover.module.css";

interface BookCoverProps {
  coverUrl: string | null;
  title: string;
}

function BookCover({ coverUrl, title }: BookCoverProps) {
  if (!coverUrl) {
    return (
      <div className={styles.coverContainer}>
        <div className={styles.coverFallback}>No cover available</div>
      </div>
    );
  }

  return (
    <div className={styles.coverContainer}>
      <img
        className={styles.coverImage}
        src={coverUrl}
        alt={`Cover of ${title}`}
      />
    </div>
  );
}

export default BookCover;
