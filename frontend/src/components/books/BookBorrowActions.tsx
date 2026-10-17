import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ApiError } from "../../api/authApi";
import { getBookAvailability } from "../../api/bookInventoryApi";
import { borrowBook } from "../../api/loanApi";
import { useAuthErrorHandler } from "../../hooks/useAuthErrorHandler";
import type { BookAvailability } from "../../types/loan";
import { createReservation } from "../../api/reservationApi";
import type { Reservation } from "../../types/reservation";
import styles from "./BookBorrowActions.module.css";

interface BookBorrowActionsProps {
  openLibraryId: string;
  alreadyBorrowed?: boolean;
  borrowedStatus?: "loading" | "ready" | "error";
  reservation?: Reservation;
  onBorrowSuccess?: (openLibraryId: string) => void;
  onReservationSuccess?: (reservation: Reservation) => void;
  onReservationRefresh?: () => void;
}

function BookBorrowActions({
  openLibraryId,
  alreadyBorrowed = false,
  borrowedStatus = "ready",
  reservation,
  onBorrowSuccess,
  onReservationSuccess,
  onReservationRefresh,
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

  const [reservingContext, setReservingContext] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isBorrowing = borrowingContext === operationContext;
  const borrowed = borrowedContext === operationContext;

  const isReserving = reservingContext === operationContext;

  const reservationPending = reservation?.status === "PENDING";
  const reservationReady = reservation?.status === "READY";

  const hasFreeCopies = availability?.isAvailable === true;

  const noCopiesAvailable =
    availability !== null && availability.availableCopies === 0;

  const shouldReserve =
    noCopiesAvailable &&
    !reservationPending &&
    !reservationReady &&
    !borrowed &&
    !alreadyBorrowed;

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
      isReserving ||
      borrowed ||
      alreadyBorrowed ||
      reservationPending ||
      (isAuthenticated && borrowedStatus !== "ready") ||
      (!hasFreeCopies && !reservationReady)
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

        onReservationRefresh?.();

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

  async function handleReserve() {
    if (!isAuthenticated || !token) {
      navigate("/login", {
        state: { from: location },
      });
      return;
    }

    if (
      isReserving ||
      isBorrowing ||
      borrowed ||
      alreadyBorrowed ||
      reservationPending ||
      reservationReady ||
      borrowedStatus !== "ready" ||
      !shouldReserve
    ) {
      return;
    }

    const requestContext = operationContext;

    setReservingContext(requestContext);
    setError("");
    setMessage("");

    try {
      const response = await createReservation(openLibraryId, token);

      if (
        !mountedRef.current ||
        operationContextRef.current !== requestContext
      ) {
        return;
      }

      onReservationSuccess?.(response.reservation);
      setMessage("Reservation created successfully.");
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
        onReservationRefresh?.();

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
          // Preserve the original reservation error.
        }
      }

      setError(
        err instanceof Error ? err.message : "Could not reserve this book.",
      );
    } finally {
      if (
        mountedRef.current &&
        operationContextRef.current === requestContext
      ) {
        setReservingContext(null);
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

  const isActionDisabled =
    isLoading ||
    isBorrowing ||
    isReserving ||
    borrowed ||
    alreadyBorrowed ||
    reservationPending ||
    (isAuthenticated && borrowedStatus !== "ready") ||
    (!reservationReady && !shouldReserve && !hasFreeCopies);

  const actionLabel =
    borrowed || alreadyBorrowed
      ? "Already borrowed"
      : reservationPending
        ? "Reservation pending"
        : isBorrowing
          ? "Borrowing..."
          : isReserving
            ? "Reserving..."
            : !isAuthenticated
              ? shouldReserve
                ? "Sign in to reserve"
                : "Sign in to borrow"
              : borrowedStatus === "loading"
                ? "Checking your account..."
                : borrowedStatus === "error"
                  ? "Account unavailable"
                  : reservationReady
                    ? "Ready to borrow"
                    : shouldReserve
                      ? "Reserve book"
                      : hasFreeCopies
                        ? "Borrow book"
                        : "Unavailable";

  const actionButtonClassName = `${styles.borrowButton} ${
    borrowed || alreadyBorrowed
      ? styles.borrowedButton
      : reservationPending
        ? styles.pendingButton
        : isBorrowing
          ? styles.borrowActionButton
          : isReserving
            ? styles.reserveButton
            : !isAuthenticated
              ? shouldReserve
                ? styles.reserveButton
                : styles.borrowActionButton
              : borrowedStatus === "loading"
                ? styles.loadingButton
                : borrowedStatus === "error"
                  ? styles.errorButton
                  : reservationReady
                    ? styles.readyButton
                    : shouldReserve
                      ? styles.reserveButton
                      : hasFreeCopies
                        ? styles.borrowActionButton
                        : styles.unavailableButton
  }`;

  return (
    <div className={styles.actions}>
      <p className={styles.availability} aria-live="polite">
        {isLoading
          ? "Checking availability..."
          : reservationReady
            ? "A copy is reserved for you."
            : availability
              ? `${availability.availableCopies} of ${availability.stock} copies available`
              : "Availability unavailable"}
      </p>

      {availability && (
        <button
          type="button"
          className={actionButtonClassName}
          onClick={() => {
            if (shouldReserve) {
              void handleReserve();
            } else {
              void handleBorrow();
            }
          }}
          disabled={isActionDisabled}
        >
          {actionLabel}
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
