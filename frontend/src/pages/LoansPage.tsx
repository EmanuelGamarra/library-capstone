import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getMyActiveLoans, returnBook } from "../api/loanApi";
import type { Loan } from "../types/loan";
import styles from "./LoansPage.module.css";
import { ApiError } from "../api/authApi";

const DUE_SOON_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isDueSoon(loan: Loan, now: number) {
  const remaining = new Date(loan.dueAt).getTime() - now;

  return remaining >= 0 && remaining <= DUE_SOON_DAYS * DAY_MS;
}

function LoansPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReturning, setIsReturning] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [now] = useState(() => Date.now());

  const handleExpiredSession = useCallback(
    (error: unknown): boolean => {
      if (!(error instanceof ApiError) || error.status !== 401) {
        return false;
      }

      logout();

      navigate("/login", {
        replace: true,
        state: {
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
          sessionExpired: true,
        },
      });

      return true;
    },
    [logout, navigate, location],
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function loadLoans() {
      setIsLoading(true);
      setError("");

      try {
        const response = await getMyActiveLoans(token!);

        if (!cancelled) {
          setLoans(response.loans);
        }
      } catch (err) {
        if (!cancelled) {
          if (!handleExpiredSession(err)) {
            setError("Unable to load your loans.");
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadLoans();

    return () => {
      cancelled = true;
    };
  }, [token, reloadKey, handleExpiredSession]);

  async function handleReturn(loanId: string) {
    if (!token || isReturning) {
      return;
    }

    setIsReturning(loanId);
    setError("");
    setMessage("");

    try {
      await returnBook(loanId, token);

      setLoans((previous) => previous.filter((loan) => loan.id !== loanId));

      setMessage("Book returned successfully.");
    } catch (err) {
      if (!handleExpiredSession(err)) {
        setError(
          err instanceof Error ? err.message : "Unable to return this book.",
        );
      }
    } finally {
      setIsReturning(null);
    }
  }

  const dueSoonCount = loans.filter((loan) => isDueSoon(loan, now)).length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>My Loans</h1>
        <p>Here's an overview of your library borrowing activity.</p>
      </header>

      <section className={styles.summaryGrid} aria-label="Loan summary">
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Current Borrowed</span>
          <strong className={styles.summaryValue}>
            {isLoading || error ? "—" : loans.length}
          </strong>
        </div>

        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Due Soon</span>
          <strong className={styles.summaryValue}>
            {isLoading || error ? "—" : dueSoonCount}
          </strong>
          <span className={styles.summaryHint}>Within the next 3 days</span>
        </div>
      </section>

      <section
        className={styles.loansSection}
        aria-labelledby="borrowed-books-heading"
      >
        <div className={styles.sectionHeader}>
          <h2 id="borrowed-books-heading">My Borrowed Books</h2>
          <p>Books you currently have on loan.</p>
        </div>

        {message && (
          <p className={styles.success} role="status">
            {message}
          </p>
        )}

        {error && (
          <div className={styles.feedback} role="alert">
            <p>{error}</p>
            <button
              type="button"
              className={styles.retryButton}
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Try again
            </button>
          </div>
        )}

        {isLoading ? (
          <p role="status">Loading your loans...</p>
        ) : error ? null : loans.length === 0 ? (
          <div className={styles.empty}>
            <h3>No active loans</h3>
            <p>Explore the catalog to borrow your first book.</p>
            <Link to="/catalog">Browse catalog</Link>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Book</th>
                  <th scope="col">Borrow Date</th>
                  <th scope="col">Due Date</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loans.map((loan) => {
                  const overdue = new Date(loan.dueAt).getTime() < now;

                  const bookIdentifier = loan.openLibraryId ?? loan.bookId;

                  return (
                    <tr key={loan.id}>
                      <td>
                        {loan.openLibraryId ? (
                          <Link
                            className={styles.bookLink}
                            to={`/books/${loan.openLibraryId}`}
                          >
                            {bookIdentifier}
                          </Link>
                        ) : (
                          bookIdentifier
                        )}
                      </td>

                      <td>{formatDate(loan.borrowedAt)}</td>
                      <td>{formatDate(loan.dueAt)}</td>

                      <td>
                        <span
                          className={overdue ? styles.overdue : styles.active}
                        >
                          {overdue ? "Overdue" : "Active"}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className={styles.returnButton}
                          onClick={() => void handleReturn(loan.id)}
                          disabled={isReturning !== null}
                          aria-label={`Return book ${bookIdentifier}`}
                        >
                          {isReturning === loan.id ? "Returning..." : "Return"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default LoansPage;
