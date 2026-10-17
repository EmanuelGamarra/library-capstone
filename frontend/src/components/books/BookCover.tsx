import { useState } from "react";
import styles from "./BookCover.module.css";

interface BookCoverProps {
  coverUrl: string | null;
  title: string;
  fallbackVariant?: "default" | "compact";
}

function BookCover({
  coverUrl,
  title,
  fallbackVariant = "default",
}: BookCoverProps) {
  const [hasError, setHasError] = useState(false);

  const coverInitial = title.trim().charAt(0).toUpperCase() || "?";

  if (!coverUrl || hasError) {
    const containerClassName =
      fallbackVariant === "compact"
        ? `${styles.coverContainer} ${styles.compactFallbackContainer}`
        : styles.coverContainer;

    return (
      <div
        className={containerClassName}
        role="img"
        aria-label={`No cover available for ${title}`}
      >
        <div className={styles.coverFallback}>
          <span className={styles.coverInitial} aria-hidden="true">
            {coverInitial}
          </span>

          {fallbackVariant === "default" && (
            <span className={styles.fallbackText}>Cover unavailable</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.coverContainer}>
      <img
        className={styles.coverImage}
        src={coverUrl}
        alt={`Cover of ${title}`}
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default BookCover;
