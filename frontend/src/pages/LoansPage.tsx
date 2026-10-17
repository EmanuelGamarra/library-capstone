import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuthErrorHandler } from "../hooks/useAuthErrorHandler";
import { Link } from "react-router-dom";
import { getMyLoans, returnBook } from "../api/loanApi";
import { getBookMetadata } from "../api/openLibraryApi";
import { useAuth } from "../hooks/useAuth";
import type { Loan } from "../types/loan";
import type { BookMetadata } from "../types/bookMetadata";
import LoanTable from "../components/loans/LoanTable";
import styles from "./LoansPage.module.css";

const DUE_SOON_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

type MetadataMap = Record<string, BookMetadata>;

function isDueSoon(loan: Loan, now: number): boolean {
  const remaining = new Date(loan.dueAt).getTime() - now;

  return remaining >= 0 && remaining <= DUE_SOON_DAYS * DAY_MS;
}

function LoansPage() {
  const { token } = useAuth();
  const handleAuthError = useAuthErrorHandler();
  const sessionContext = token;
  const sessionContextRef = useRef(sessionContext);
  const mountedRef = useRef(false);

  useLayoutEffect(() => {
    sessionContextRef.current = sessionContext;
  }, [sessionContext]);

  const [loans, setLoans] = useState<Loan[]>([]);
  const [metadataById, setMetadataById] = useState<MetadataMap>({});

  const [isLoading, setIsLoading] = useState(() => Boolean(token));
  const [returningRequest, setReturningRequest] = useState<{
    loanId: string;
    context: string;
  } | null>(null);

  const [error, setError] = useState("");
  const [returnError, setReturnError] = useState("");
  const [message, setMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [now] = useState(() => Date.now());

  const returningId =
    returningRequest?.context === sessionContext
      ? returningRequest.loanId
      : null;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function loadLoans() {
      setIsLoading(true);
      setError("");

      try {
        const response = await getMyLoans(token!);

        if (cancelled) {
          return;
        }

        setLoans(response.loans);
        setIsLoading(false);

        const ids = [
          ...new Set(
            response.loans
              .map((loan) => loan.openLibraryId)
              .filter((id): id is string => Boolean(id)),
          ),
        ];

        const results = await Promise.allSettled(
          ids.map((id) => getBookMetadata(id)),
        );

        if (cancelled) {
          return;
        }

        const metadata: MetadataMap = {};

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            metadata[result.value.openLibraryId] = result.value;
          }
        });

        setMetadataById(metadata);
      } catch (err) {
        if (cancelled) {
          return;
        }

        if (!handleAuthError(err)) {
          setError("Unable to load your loans.");
        }

        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadLoans();

    return () => {
      cancelled = true;
    };
  }, [token, reloadKey, handleAuthError]);

  async function handleReturn(loanId: string) {
    if (!token || returningId) return;

    const requestContext = token;

    setReturningRequest({ loanId, context: requestContext });
    setReturnError("");
    setMessage("");

    try {
      const response = await returnBook(loanId, token);

      if (!mountedRef.current || sessionContextRef.current !== requestContext) {
        return;
      }

      setLoans((previous) =>
        previous.map((loan) =>
          loan.id === loanId
            ? {
                ...loan,
                returnedAt: response.loan.returnedAt,
                status: "RETURNED",
              }
            : loan,
        ),
      );

      setMessage("Book returned successfully.");
    } catch (err) {
      if (!mountedRef.current || sessionContextRef.current !== requestContext) {
        return;
      }

      if (!handleAuthError(err)) {
        setReturnError(
          err instanceof Error ? err.message : "Unable to return this book.",
        );
      }
    } finally {
      if (mountedRef.current && sessionContextRef.current === requestContext) {
        setReturningRequest(null);
      }
    }
  }

  const currentLoans = loans.filter((loan) => loan.returnedAt === null);

  const loanHistory = loans.filter((loan) => loan.returnedAt !== null);

  const dueSoonCount = currentLoans.filter((loan) =>
    isDueSoon(loan, now),
  ).length;

  const summaryValue = (value: number) => (isLoading || error ? "—" : value);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>My Loans</h1>
        <p>Manage your current loans and review your borrowing history.</p>
      </header>

      <section className={styles.summaryGrid} aria-label="Loan summary">
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Current Borrowed</span>
          <strong className={styles.summaryValue}>
            {summaryValue(currentLoans.length)}
          </strong>
        </div>

        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Due Soon</span>
          <strong className={styles.summaryValue}>
            {summaryValue(dueSoonCount)}
          </strong>
          <span className={styles.summaryHint}>Within the next 3 days</span>
        </div>
      </section>

      {returnError && (
        <p className={styles.feedback} role="alert">
          {returnError}
        </p>
      )}

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
      ) : !error ? (
        <>
          <section
            className={styles.loansSection}
            aria-labelledby="current-loans-heading"
          >
            <div className={styles.sectionHeader}>
              <h2 id="current-loans-heading">Current Loans</h2>
              <p>Books you have not returned yet.</p>
            </div>

            {currentLoans.length === 0 ? (
              <div className={styles.empty}>
                <h3>No current loans</h3>
                <p>Explore the catalog to borrow a book.</p>
                <Link to="/catalog">Browse catalog</Link>
              </div>
            ) : (
              <LoanTable
                loans={currentLoans}
                metadataById={metadataById}
                now={now}
                returningId={returningId}
                onReturn={(id) => void handleReturn(id)}
              />
            )}
          </section>

          <section
            className={styles.loansSection}
            aria-labelledby="loan-history-heading"
          >
            <div className={styles.sectionHeader}>
              <h2 id="loan-history-heading">Loan History</h2>
              <p>Your previously returned books.</p>
            </div>

            {loanHistory.length === 0 ? (
              <div className={styles.empty}>
                <h3>No loan history yet</h3>
                <p>Returned books will appear here.</p>
              </div>
            ) : (
              <LoanTable
                loans={loanHistory}
                metadataById={metadataById}
                now={now}
              />
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}

export default LoansPage;
