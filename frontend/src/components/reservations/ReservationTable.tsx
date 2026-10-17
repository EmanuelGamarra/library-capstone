import { Link } from "react-router-dom";
import BookCover from "../books/BookCover";
import type { BookMetadata } from "../../types/bookMetadata";
import type { Reservation } from "../../types/reservation";
import styles from "./ReservationTable.module.css";

interface ReservationTableProps {
  reservations: Reservation[];
  metadataById: Record<string, BookMetadata>;
  busyId: string | null;
  onCancel: (reservationId: string) => void;
  onBorrow: (reservation: Reservation) => void;
}

function formatDate(value: string | null): string {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ReservationTable({
  reservations,
  metadataById,
  busyId,
  onCancel,
  onBorrow,
}: ReservationTableProps) {
  return (
    <div
      className={styles.tableWrapper}
      tabIndex={0}
      role="region"
      aria-label="Reservations table"
    >
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Book</th>
            <th scope="col">Reserved On</th>
            <th scope="col">Claim By</th>
            <th scope="col">Status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>

        <tbody>
          {reservations.map((reservation) => {
            const metadata = metadataById[reservation.openLibraryId];
            const title = metadata?.title ?? reservation.openLibraryId;
            const author = metadata?.author ?? "Unknown author";
            const isBusy = busyId === reservation.id;
            const isActive =
              reservation.status === "PENDING" ||
              reservation.status === "READY";

            return (
              <tr key={reservation.id}>
                <td>
                  <div className={styles.bookCell}>
                    <div className={styles.bookCover}>
                      <BookCover
                        coverUrl={metadata?.coverUrl ?? null}
                        title={title}
                        fallbackVariant="compact"
                      />
                    </div>
                    <div className={styles.bookDetails}>
                      <Link
                        to={`/books/${reservation.openLibraryId}`}
                        className={styles.bookLink}
                      >
                        {title}
                      </Link>
                      <span className={styles.bookAuthor}>{author}</span>
                    </div>
                  </div>
                </td>

                <td>{formatDate(reservation.createdAt)}</td>
                <td>
                  {reservation.status === "READY" ||
                  reservation.status === "EXPIRED" ||
                  reservation.status === "FULFILLED"
                    ? formatDate(reservation.expiresAt)
                    : "—"}
                </td>
                <td>
                  <span
                    className={`${styles.status} ${
                      styles[reservation.status.toLowerCase()]
                    }`}
                  >
                    {reservation.status}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    {reservation.status === "READY" && (
                      <button
                        type="button"
                        className={styles.borrowButton}
                        onClick={() => onBorrow(reservation)}
                        disabled={busyId !== null}
                        aria-label={`Borrow ${title}`}
                      >
                        {isBusy ? "Borrowing..." : "Borrow"}
                      </button>
                    )}

                    {isActive && (
                      <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={() => onCancel(reservation.id)}
                        disabled={busyId !== null}
                        aria-label={`Cancel reservation for ${title}`}
                      >
                        {isBusy ? "Processing..." : "Cancel"}
                      </button>
                    )}

                    {!isActive && <span className={styles.noAction}>—</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ReservationTable;
