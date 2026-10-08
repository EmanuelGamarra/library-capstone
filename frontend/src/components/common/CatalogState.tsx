import styles from "./CatalogState.module.css";

type CatalogStateType = "loading" | "empty" | "error";

interface CatalogStateProps {
  type: CatalogStateType;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

function CatalogState({
  type,
  title,
  message,
  actionLabel,
  onAction,
}: CatalogStateProps) {
  return (
    <div
      className={styles.state}
      role={type === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {type === "loading" && (
        <div className={styles.spinner} aria-hidden="true" />
      )}

      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>

        {message && <p className={styles.message}>{message}</p>}

        {actionLabel && onAction && (
          <button
            type="button"
            className={styles.actionButton}
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default CatalogState;
