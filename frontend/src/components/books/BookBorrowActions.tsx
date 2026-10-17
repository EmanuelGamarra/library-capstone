import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ApiError } from "../../api/authApi";
import { getBookAvailability } from "../../api/bookInventoryApi";
import { borrowBook } from "../../api/loanApi";
import { useAuthErrorHandler } from "../../hooks/useAuthErrorHandler";
import type { BookAvailability } from "../../types/loan";
import styles from "./BookBorrowActions.module.css";

interface BookBorrowActionsProps {
  openLibraryId: string;
  alreadyBorrowed?: boolean;
  borrowedStatus?: "loading" | "ready" | "error";
  onBorrowSuccess?: (openLibraryId: string) => void;
}

function BookBorrowActions({
  openLibraryId,
  alreadyBorrowed = false,
  borrowedStatus = "ready",
  onBorrowSuccess,
}: BookBorrowActionsProps) {
  const { token, isAuthenticated } = useAuth();
  const handleAuthError = useAuthErrorHandler();
  const navigate = useNavigate();
  const location = useLocation();
  const operationContext = `${openLibraryId}:${token ?? "anonymous"}`;
  const operationContextRef = useRef(operationContext);
  const mountedRef = useRef(false);

  useLayoutEffect(() => {
    operationContextRef.current = operationContext;
  }, [operationContext]);

  const [availability, setAvailability] = useState<BookAvailability | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [borrowingContext, setBorrowingContext] = useState<string | null>(null);
  const [borrowedContext, setBorrowedContext] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isBorrowing = borrowingContext === operationContext;
  const borrowed = borrowedContext === operationContext;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      try {
        const result = await getBookAvailability(openLibraryId);

        if (!cancelled) {
          setAvailability(result);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError("Could not load availability.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [openLibraryId]);

  async function handleBorrow() {
    if (!isAuthenticated || !token) {
      navigate("/login", {
        state: { from: location },
      });
      return;
    }

    if (
      isBorrowing ||
      borrowed ||
      alreadyBorrowed ||
      (isAuthenticated && borrowedStatus !== "ready") ||
      !availability?.isAvailable
    ) {
      return;
    }

    const requestContext = operationContext;

    setBorrowingContext(requestContext);
    setError("");
    setMessage("");

    try {
      const result = await borrowBook(openLibraryId, token);

      if (
        !mountedRef.current ||
        operationContextRef.current !== requestContext
      ) {
        return;
      }

      setBorrowedContext(requestContext);
      onBorrowSuccess?.(openLibraryId);
      setMessage("Book borrowed successfully.");

      setAvailability((current) =>
        current
          ? {
              ...current,
              activeLoans: current.activeLoans + 1,
              availableCopies: result.availableCopies,
              isAvailable: result.availableCopies > 0,
            }
          : current,
      );
    } catch (err) {
      if (
        !mountedRef.current ||
        operationContextRef.current !== requestContext
      ) {
        return;
      }

      if (handleAuthError(err)) {
        return;
      }

      if (err instanceof ApiError && err.status === 409) {
        setError(err.message);

        try {
          const latest = await getBookAvailability(openLibraryId);

          if (
            !mountedRef.current ||
            operationContextRef.current !== requestContext
          ) {
            return;
          }

          setAvailability(latest);
        } catch {
          // Preserve original conflict message
        }
      } else {
        setError(
          err instanceof Error ? err.message : "Could not borrow this book.",
        );
      }
    } finally {
      if (
        mountedRef.current &&
        operationContextRef.current === requestContext
      ) {
        setBorrowingContext(null);
      }
    }
  }

  async function retryAvailability() {
    const requestContext = operationContext;

    setIsLoading(true);
    setError("");

    try {
      const result = await getBookAvailability(openLibraryId);

      if (
        !mountedRef.current ||
        operationContextRef.current !== requestContext
      ) {
        return;
      }

      setAvailability(result);
    } catch {
      if (
        !mountedRef.current ||
        operationContextRef.current !== requestContext
      ) {
        return;
      }

      setAvailability(null);
      setError("Could not load availability.");
    } finally {
      if (
        mountedRef.current &&
        operationContextRef.current === requestContext
      ) {
        setIsLoading(false);
      }
    }
  }

  return (
    <div className={styles.actions}>
      <p className={styles.availability} aria-live="polite">
        {isLoading
          ? "Checking availability..."
          : availability
            ? `${availability.availableCopies} of ${availability.stock} copies available`
            : "Availability unavailable"}
      </p>

      {availability && (
        <button
          type="button"
          className={styles.borrowButton}
          onClick={() => void handleBorrow()}
          disabled={
            isLoading ||
            isBorrowing ||
            borrowed ||
            alreadyBorrowed ||
            (isAuthenticated && borrowedStatus !== "ready") ||
            !availability.isAvailable
          }
        >
          {borrowed || alreadyBorrowed
            ? "Already borrowed"
            : isBorrowing
              ? "Borrowing..."
              : !availability.isAvailable
                ? "Unavailable"
                : !isAuthenticated
                  ? "Sign in to borrow"
                  : borrowedStatus === "loading"
                    ? "Checking your loans..."
                    : borrowedStatus === "error"
                      ? "Loans unavailable"
                      : "Borrow book"}
        </button>
      )}

      {!isLoading && !availability && (
        <button
          type="button"
          className={styles.retryButton}
          onClick={() => void retryAvailability()}
        >
          Retry availability
        </button>
      )}

      {message && (
        <p className={styles.success} role="status">
          {message}
        </p>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default BookBorrowActions;
