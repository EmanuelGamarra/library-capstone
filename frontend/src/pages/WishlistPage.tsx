import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CatalogState from "../components/common/CatalogState";
import WishlistBookCard from "../components/wishlist/WishlistBookCard";
import { getBookDetails } from "../api/openLibraryApi";
import { getMyWishlist, removeFromWishlist } from "../api/wishlistApi";
import { getMyActiveLoans } from "../api/loanApi";
import { getMyReservations } from "../api/reservationApi";
import { useAuth } from "../hooks/useAuth";
import { useAuthErrorHandler } from "../hooks/useAuthErrorHandler";
import type { BookDetail } from "../types/bookDetail";
import type { WishlistItem } from "../types/wishlist";
import type { Reservation } from "../types/reservation";
import { ApiError } from "../api/authApi";
import styles from "./WishlistPage.module.css";

interface WishlistSnapshot {
  token: string;
  items: WishlistItem[];
}

interface OwnershipSnapshot {
  token: string;
  borrowedIds: Set<string>;
  reservationsByBook: Record<string, Reservation>;
}

function WishlistPage() {
  const { token } = useAuth();
  const handleAuthError = useAuthErrorHandler();

  const [wishlist, setWishlist] = useState<WishlistSnapshot | null>(null);
  const [details, setDetails] = useState<Record<string, BookDetail | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const [ownership, setOwnership] = useState<OwnershipSnapshot | null>(null);
  const [ownershipError, setOwnershipError] = useState(false);
  const [ownershipRetryKey, setOwnershipRetryKey] = useState(0);

  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [removeErrors, setRemoveErrors] = useState<Record<string, string>>({});

  const mountedRef = useRef(false);
  const tokenRef = useRef(token);

  useLayoutEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    let cancelled = false;

    async function loadWishlist() {
      setIsLoading(true);
      setError("");
      setWishlist(null);
      setDetails({});
      setRemoveErrors({});
      setRemovingIds(new Set());

      try {
        const response = await getMyWishlist(token!, controller.signal);

        if (cancelled) {
          return;
        }

        setWishlist({
          token: token!,
          items: response.items,
        });

        setIsLoading(false);

        if (response.items.length === 0) return;

        const results = await Promise.allSettled(
          response.items.map((item) =>
            getBookDetails(item.openLibraryId, controller.signal),
          ),
        );

        if (cancelled) return;

        const mapped: Record<string, BookDetail | null> = {};

        response.items.forEach((item, index) => {
          const result = results[index];

          mapped[item.openLibraryId] =
            result.status === "fulfilled" ? result.value : null;
        });

        setDetails(mapped);
      } catch (err) {
        if (cancelled) return;

        if (!handleAuthError(err)) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your wishlist.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadWishlist();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token, retryKey, handleAuthError]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function loadOwnership() {
      setOwnership(null);
      setOwnershipError(false);

      try {
        const [loansResponse, reservationsResponse] = await Promise.all([
          getMyActiveLoans(token!),
          getMyReservations(token!),
        ]);

        if (cancelled) return;

        const borrowedIds = new Set(
          loansResponse.loans
            .map((loan) => loan.openLibraryId)
            .filter((id): id is string => Boolean(id)),
        );

        const reservationsByBook: Record<string, Reservation> = {};

        for (const reservation of reservationsResponse.reservations) {
          if (
            reservation.status === "PENDING" ||
            reservation.status === "READY"
          ) {
            reservationsByBook[reservation.openLibraryId] = reservation;
          }
        }

        setOwnership({
          token: token!,
          borrowedIds,
          reservationsByBook,
        });
      } catch (err) {
        if (cancelled) return;

        if (!handleAuthError(err)) {
          setOwnershipError(true);
        }
      }
    }

    void loadOwnership();

    return () => {
      cancelled = true;
    };
  }, [token, ownershipRetryKey, handleAuthError]);

  async function handleRemove(openLibraryId: string) {
    if (!token || removingIds.has(openLibraryId)) return;

    const requestToken = token;

    setRemovingIds((current) => new Set(current).add(openLibraryId));

    setRemoveErrors((current) => {
      const next = { ...current };
      delete next[openLibraryId];
      return next;
    });

    try {
      await removeFromWishlist(openLibraryId, token);

      if (!mountedRef.current || tokenRef.current !== requestToken) {
        return;
      }

      setWishlist((current) => {
        if (!current || current.token !== requestToken) return current;

        return {
          ...current,
          items: current.items.filter(
            (item) => item.openLibraryId !== openLibraryId,
          ),
        };
      });
    } catch (err) {
      if (!mountedRef.current || tokenRef.current !== requestToken) {
        return;
      }

      if (handleAuthError(err)) {
        return;
      }

      if (err instanceof ApiError && err.status === 404) {
        setWishlist((current) => {
          if (!current || current.token !== requestToken) {
            return current;
          }

          return {
            ...current,
            items: current.items.filter(
              (item) => item.openLibraryId !== openLibraryId,
            ),
          };
        });

        return;
      }

      setRemoveErrors((current) => ({
        ...current,
        [openLibraryId]:
          err instanceof Error ? err.message : "Unable to remove this book.",
      }));
    } finally {
      if (mountedRef.current && tokenRef.current === requestToken) {
        setRemovingIds((current) => {
          const next = new Set(current);
          next.delete(openLibraryId);
          return next;
        });
      }
    }
  }

  function handleBorrowSuccess(openLibraryId: string) {
    setOwnership((current) => {
      if (!current || current.token !== token) {
        return current;
      }

      const borrowedIds = new Set(current.borrowedIds);
      borrowedIds.add(openLibraryId);

      const reservationsByBook = { ...current.reservationsByBook };
      delete reservationsByBook[openLibraryId];

      return { ...current, borrowedIds, reservationsByBook };
    });
  }

  function handleReservationSuccess(reservation: Reservation) {
    setOwnership((current) => {
      if (!current || current.token !== token) return current;

      return {
        ...current,
        reservationsByBook: {
          ...current.reservationsByBook,
          [reservation.openLibraryId]: reservation,
        },
      };
    });
  }

  function refreshOwnership() {
    setOwnership(null);
    setOwnershipRetryKey((value) => value + 1);
  }

  const items = wishlist?.token === token ? wishlist.items : null;
  const ownershipReady = ownership?.token === token;
  const borrowedStatus = ownershipReady
    ? "ready"
    : ownershipError
      ? "error"
      : "loading";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>My Wishlist</h1>
        <p>Books you've saved to borrow later.</p>
      </header>

      {isLoading && (
        <CatalogState
          type="loading"
          title="Loading your wishlist"
          message="Retrieving your saved books..."
        />
      )}

      {!isLoading && error && (
        <CatalogState
          type="error"
          title="Unable to load your wishlist"
          message={error}
          actionLabel="Try again"
          onAction={() => setRetryKey((value) => value + 1)}
        />
      )}

      {!isLoading && !error && items?.length === 0 && (
        <div className={styles.emptyState}>
          <h2>Your wishlist is empty</h2>
          <p>Explore the catalog and save books to borrow later.</p>
          <Link to="/catalog" className={styles.catalogLink}>
            Explore Catalog
          </Link>
        </div>
      )}

      {!isLoading && !error && items && items.length > 0 && (
        <>
          {ownershipError && !ownershipReady && (
            <div className={styles.ownershipNotice} role="alert">
              <p>Unable to verify your loans and reservations.</p>
              <button type="button" onClick={refreshOwnership}>
                Retry account status
              </button>
            </div>
          )}

          <ul className={styles.grid}>
            {items.map((item) => (
              <li className={styles.gridItem} key={item.id}>
                <WishlistBookCard
                  openLibraryId={item.openLibraryId}
                  book={details[item.openLibraryId]}
                  alreadyBorrowed={
                    ownership?.token === token
                      ? ownership.borrowedIds.has(item.openLibraryId)
                      : false
                  }
                  borrowedStatus={borrowedStatus}
                  reservation={
                    ownershipReady
                      ? ownership.reservationsByBook[item.openLibraryId]
                      : undefined
                  }
                  isRemoving={removingIds.has(item.openLibraryId)}
                  removeError={removeErrors[item.openLibraryId]}
                  onRemove={handleRemove}
                  onBorrowSuccess={handleBorrowSuccess}
                  onReservationSuccess={handleReservationSuccess}
                  onReservationRefresh={refreshOwnership}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

export default WishlistPage;
