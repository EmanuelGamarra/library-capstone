import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ApiError } from "../../api/authApi";
import { getBookAvailability } from "../../api/bookInventoryApi";
import { borrowBook } from "../../api/loanApi";
import type { BookAvailability } from "../../types/loan";
import styles from "./BookBorrowActions.module.css";

interface BookBorrowActionsProps {
  openLibraryId: string;
}

function BookBorrowActions({ openLibraryId }: BookBorrowActionsProps) {
  const { token, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [availability, setAvailability] = useState<BookAvailability | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [borrowed, setBorrowed] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

    if (isBorrowing || borrowed || !availability?.isAvailable) {
      return;
    }

    setIsBorrowing(true);
    setError("");
    setMessage("");

    try {
      const result = await borrowBook(openLibraryId, token);

      setBorrowed(true);
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
      if (err instanceof ApiError && err.status === 409) {
        setError(err.message);

        try {
          const latest = await getBookAvailability(openLibraryId);
          setAvailability(latest);
        } catch {
          // Keep original message
        }
      } else if (err instanceof ApiError && err.status === 401) {
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

        return;
      } else {
        setError(
          err instanceof Error ? err.message : "Could not borrow this book.",
        );
      }
    } finally {
      setIsBorrowing(false);
    }
  }

  async function retryAvailability() {
    setIsLoading(true);
    setError("");

    try {
      const result = await getBookAvailability(openLibraryId);
      setAvailability(result);
    } catch {
      setAvailability(null);
      setError("Could not load availability.");
    } finally {
      setIsLoading(false);
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
            isLoading || isBorrowing || borrowed || !availability.isAvailable
          }
        >
          {borrowed
            ? "Borrowed"
            : isBorrowing
              ? "Borrowing..."
              : !availability.isAvailable
                ? "Unavailable"
                : !isAuthenticated
                  ? "Sign in to borrow"
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
