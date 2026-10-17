import { Link } from "react-router-dom";

import type { BookMetadata } from "../../types/bookMetadata";
import type { Loan } from "../../types/loan";

import BookCover from "../books/BookCover";
import styles from "./LoanTable.module.css";

interface LoanTableProps {
  loans: Loan[];
  metadataById: Record<string, BookMetadata>;
  now: number;
  returningId?: string | null;
  onReturn?: (loanId: string) => void;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getLoanStatus(loan: Loan, now: number) {
  if (loan.returnedAt !== null) return "RETURNED";

  return new Date(loan.dueAt).getTime() < now ? "OVERDUE" : "ACTIVE";
}

function LoanTable({
  loans,
  metadataById,
  now,
  returningId = null,
  onReturn,
}: LoanTableProps) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Book</th>
            <th scope="col">Borrow Date</th>
            <th scope="col">Due Date</th>
            <th scope="col">Status</th>
            <th scope="col">{onReturn ? "Actions" : "Return Date"}</th>
          </tr>
        </thead>

        <tbody>
          {loans.map((loan) => {
            const metadata = loan.openLibraryId
              ? metadataById[loan.openLibraryId]
              : undefined;

            const bookIdentifier = loan.openLibraryId ?? loan.bookId;
            const title = metadata?.title ?? bookIdentifier;
            const author = metadata?.author ?? "Unknown author";
            const status = getLoanStatus(loan, now);

            return (
              <tr key={loan.id}>
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
                      {loan.openLibraryId ? (
                        <Link
                          className={styles.bookLink}
                          to={`/books/${loan.openLibraryId}`}
                        >
                          {title}
                        </Link>
                      ) : (
                        <strong>{title}</strong>
                      )}

                      <span className={styles.bookAuthor}>{author}</span>
                    </div>
                  </div>
                </td>

                <td>{formatDate(loan.borrowedAt)}</td>
                <td>{formatDate(loan.dueAt)}</td>

                <td>
                  <span
                    className={
                      status === "RETURNED"
                        ? styles.returned
                        : status === "OVERDUE"
                          ? styles.overdue
                          : styles.active
                    }
                  >
                    {status === "RETURNED"
                      ? "Returned"
                      : status === "OVERDUE"
                        ? "Overdue"
                        : "Active"}
                  </span>
                </td>

                <td>
                  {onReturn ? (
                    <button
                      type="button"
                      className={styles.returnButton}
                      onClick={() => onReturn(loan.id)}
                      disabled={returningId !== null}
                      aria-label={`Return ${title}`}
                    >
                      {returningId === loan.id ? "Returning..." : "Return"}
                    </button>
                  ) : loan.returnedAt ? (
                    formatDate(loan.returnedAt)
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default LoanTable;
