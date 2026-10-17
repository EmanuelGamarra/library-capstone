import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { getMyReservations, cancelReservation } from "../api/reservationApi";
import { borrowBook } from "../api/loanApi";
import { getBookMetadata } from "../api/openLibraryApi";
import { useAuth } from "../hooks/useAuth";
import { useAuthErrorHandler } from "../hooks/useAuthErrorHandler";

import type { Reservation } from "../types/reservation";
import type { BookMetadata } from "../types/bookMetadata";

import ReservationTable from "../components/reservations/ReservationTable";
import styles from "./ReservationsPage.module.css";

type MetadataMap = Record<string, BookMetadata>;

const EXPIRING_SOON_MS = 24 * 60 * 60 * 1000;

function ReservationsPage() {
  const { token } = useAuth();
  const handleAuthError = useAuthErrorHandler();

  const mountedRef = useRef(false);
  const tokenRef = useRef(token);
  const loadedTokenRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [metadataById, setMetadataById] = useState<MetadataMap>({});
  const [now, setNow] = useState(() => Date.now());
  const [hasLoadedReservations, setHasLoadedReservations] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");

  const [busyRequest, setBusyRequest] = useState<{
    id: string;
    token: string;
  } | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  const busyId = busyRequest?.token === token ? busyRequest.id : null;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function loadReservations() {
      const hasCurrentSessionData = loadedTokenRef.current === token;

      if (!hasCurrentSessionData) {
        setIsLoading(true);
        setReservations([]);
        setMetadataById({});
        setHasLoadedReservations(false);
      }

      setLoadError("");

      try {
        const response = await getMyReservations(token!);

        if (cancelled) return;

        setReservations(response.reservations);
        loadedTokenRef.current = token;
        setHasLoadedReservations(true);
        setIsLoading(false);

        const ids = [
          ...new Set(
            response.reservations.map(
              (reservation) => reservation.openLibraryId,
            ),
          ),
        ];

        const results = await Promise.allSettled(
          ids.map((id) => getBookMetadata(id)),
        );

        if (cancelled) return;

        const metadata: MetadataMap = {};

        for (const result of results) {
          if (result.status === "fulfilled") {
            metadata[result.value.openLibraryId] = result.value;
          }
        }

        setMetadataById(metadata);
      } catch (error) {
        if (cancelled) return;

        if (!handleAuthError(error)) {
          setLoadError("Unable to load your reservations.");
        }

        setIsLoading(false);
      }
    }

    void loadReservations();

    return () => {
      cancelled = true;
    };
  }, [token, reloadKey, handleAuthError]);

  async function handleAction(
    reservation: Reservation,
    action: "borrow" | "cancel",
  ) {
    if (!token || busyRequest !== null) return;

    const requestToken = token;

    setBusyRequest({ id: reservation.id, token: requestToken });
    setActionError("");
    setMessage("");

    try {
      if (action === "borrow") {
        if (reservation.status !== "READY") return;

        await borrowBook(reservation.openLibraryId, requestToken);
      } else {
        if (
          reservation.status !== "PENDING" &&
          reservation.status !== "READY"
        ) {
          return;
        }

        await cancelReservation(reservation.id, requestToken);
      }

      if (!mountedRef.current || tokenRef.current !== requestToken) {
        return;
      }

      setReservations((previous) =>
        previous.map((item) =>
          item.id === reservation.id
            ? {
                ...item,
                status: action === "borrow" ? "FULFILLED" : "CANCELLED",
              }
            : item,
        ),
      );

      setMessage(
        action === "borrow"
          ? "Book borrowed successfully."
          : "Reservation cancelled successfully.",
      );

      setReloadKey((value) => value + 1);
    } catch (error) {
      if (!mountedRef.current || tokenRef.current !== requestToken) {
        return;
      }

      if (!handleAuthError(error)) {
        setActionError(
          error instanceof Error
            ? error.message
            : "Unable to complete the reservation action.",
        );
      }
    } finally {
      if (mountedRef.current && tokenRef.current === requestToken) {
        setBusyRequest(null);
      }
    }
  }

  const activeReservations = reservations.filter(
    (reservation) =>
      reservation.status === "PENDING" || reservation.status === "READY",
  );

  const history = reservations.filter(
    (reservation) =>
      reservation.status === "FULFILLED" ||
      reservation.status === "CANCELLED" ||
      reservation.status === "EXPIRED",
  );

  const readyCount = activeReservations.filter(
    (reservation) => reservation.status === "READY",
  ).length;

  const expiringSoonCount = activeReservations.filter((reservation) => {
    if (reservation.status !== "READY" || !reservation.expiresAt) {
      return false;
    }

    const remaining = new Date(reservation.expiresAt).getTime() - now;

    return remaining > 0 && remaining <= EXPIRING_SOON_MS;
  }).length;

  const summaryValue = (count: number) =>
    isLoading || (loadError && !hasLoadedReservations) ? "—" : count;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>My Reservations</h1>
        <p>
          Track your reserved books and see which copies are ready to borrow.
        </p>
      </header>

      <section className={styles.summaryGrid} aria-label="Reservation summary">
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Active Reservations</span>
          <strong className={styles.summaryValue}>
            {summaryValue(activeReservations.length)}
          </strong>
          <span className={styles.summaryHint}>Pending and ready</span>
        </div>

        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Ready to Borrow</span>
          <strong className={styles.summaryValue}>
            {summaryValue(readyCount)}
          </strong>
          <span className={styles.summaryHint}>Copies reserved for you</span>
        </div>

        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Expiring Soon</span>
          <strong className={styles.summaryValue}>
            {summaryValue(expiringSoonCount)}
          </strong>
          <span className={styles.summaryHint}>Within the next 24 hours</span>
        </div>
      </section>

      {message && (
        <p className={styles.success} role="status">
          {message}
        </p>
      )}

      {actionError && (
        <div className={styles.feedback} role="alert">
          <p>{actionError}</p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Refresh reservations
          </button>
        </div>
      )}

      {loadError && (
        <div className={styles.feedback} role="alert">
          <p>{loadError}</p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {isLoading ? (
        <p role="status">Loading your reservations...</p>
      ) : !loadError || hasLoadedReservations ? (
        <>
          <section
            className={styles.reservationsSection}
            aria-labelledby="active-reservations-heading"
          >
            <div className={styles.sectionHeader}>
              <h2 id="active-reservations-heading">Active Reservations</h2>
              <p>Books you are waiting for or can borrow now.</p>
            </div>

            {activeReservations.length === 0 ? (
              <div className={styles.empty}>
                <h3>No active reservations</h3>
                <p>Unavailable books can be reserved from the catalog.</p>
                <Link to="/catalog">Browse catalog</Link>
              </div>
            ) : (
              <ReservationTable
                reservations={activeReservations}
                metadataById={metadataById}
                busyId={busyId}
                onBorrow={(reservation) =>
                  void handleAction(reservation, "borrow")
                }
                onCancel={(id) => {
                  const reservation = reservations.find(
                    (item) => item.id === id,
                  );
                  if (reservation) {
                    void handleAction(reservation, "cancel");
                  }
                }}
              />
            )}
          </section>

          <section
            className={styles.reservationsSection}
            aria-labelledby="reservation-history-heading"
          >
            <div className={styles.sectionHeader}>
              <h2 id="reservation-history-heading">Reservation History</h2>
              <p>Previously fulfilled, cancelled and expired reservations.</p>
            </div>

            {history.length === 0 ? (
              <div className={styles.empty}>
                <h3>No reservation history yet</h3>
                <p>Your previous reservations will appear here.</p>
              </div>
            ) : (
              <ReservationTable
                reservations={history}
                metadataById={metadataById}
                busyId={busyId}
                onBorrow={(reservation) =>
                  void handleAction(reservation, "borrow")
                }
                onCancel={() => {}}
              />
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}

export default ReservationsPage;
