import { useEffect, useMemo, useState } from "react";
import { getMyActiveLoans } from "../../api/loanApi";
import { getMyReservations } from "../../api/reservationApi";
import { getMyWishlist } from "../../api/wishlistApi";
import { getMyBooksByReadingStatus } from "../../api/readingStatusApi";
import { getBookDetails } from "../../api/openLibraryApi";
import { useAuth } from "../../hooks/useAuth";
import { useAuthErrorHandler } from "../../hooks/useAuthErrorHandler";
import type { Loan } from "../../types/loan";
import type { BookDetail } from "../../types/bookDetail";
import type { ReadingStatusRecord } from "../../types/readingStatus";
import LibraryActivitySummary from "./LibraryActivitySummary";
import type { FeaturedReading, DueSoonLoan } from "./LibraryActivitySummary";

const DUE_SOON_MS = 72 * 60 * 60 * 1000;

interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

function initialResource<T>(): Resource<T> {
  return { data: null, loading: true, error: false };
}

function selectReadingBook(
  records: ReadingStatusRecord[],
  loans: Loan[],
): { openLibraryId: string; hasActiveLoan: boolean } | null {
  const activeIds = new Set(
    loans
      .filter((loan) => loan.returnedAt === null)
      .map((loan) => loan.openLibraryId)
      .filter((id): id is string => Boolean(id)),
  );

  const selected =
    records.find((record) => activeIds.has(record.openLibraryId)) ?? records[0];

  if (!selected) return null;

  return {
    openLibraryId: selected.openLibraryId,
    hasActiveLoan: activeIds.has(selected.openLibraryId),
  };
}

function selectDueSoonLoan(loans: Loan[], now: number): Loan | null {
  const eligible = loans.filter((loan) => {
    if (loan.returnedAt !== null) return false;

    const due = new Date(loan.dueAt).getTime();

    return Number.isFinite(due) && due - now <= DUE_SOON_MS;
  });

  return (
    eligible.sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
    )[0] ?? null
  );
}

function LibraryActivitySection() {
  const { token } = useAuth();
  const handleAuthError = useAuthErrorHandler();

  const [now] = useState(() => Date.now());
  const [retryKey, setRetryKey] = useState(0);

  const [loans, setLoans] = useState<Resource<Loan[]>>(initialResource);
  const [reading, setReading] =
    useState<Resource<ReadingStatusRecord[]>>(initialResource);
  const [reservations, setReservations] =
    useState<Resource<number>>(initialResource);
  const [wishlist, setWishlist] = useState<Resource<number>>(initialResource);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    const controller = new AbortController();

    async function loadLoans() {
      try {
        const response = await getMyActiveLoans(token!);
        if (cancelled) return;

        setLoans({
          data: response.loans,
          loading: false,
          error: false,
        });
      } catch (error) {
        if (cancelled) return;
        handleAuthError(error);
        setLoans({ data: null, loading: false, error: true });
      }
    }

    async function loadReading() {
      try {
        const response = await getMyBooksByReadingStatus(
          "READING",
          token!,
          controller.signal,
        );
        if (cancelled) return;

        setReading({
          data: response.items,
          loading: false,
          error: false,
        });
      } catch (error) {
        if (cancelled) return;
        handleAuthError(error);
        setReading({ data: null, loading: false, error: true });
      }
    }

    async function loadReservations() {
      try {
        const response = await getMyReservations(token!);
        if (cancelled) return;

        const count = response.reservations.filter(
          (item) => item.status === "PENDING" || item.status === "READY",
        ).length;

        setReservations({
          data: count,
          loading: false,
          error: false,
        });
      } catch (error) {
        if (cancelled) return;
        handleAuthError(error);
        setReservations({
          data: null,
          loading: false,
          error: true,
        });
      }
    }

    async function loadWishlist() {
      try {
        const response = await getMyWishlist(token!, controller.signal);
        if (cancelled) return;

        setWishlist({
          data: response.items.length,
          loading: false,
          error: false,
        });
      } catch (error) {
        if (cancelled) return;
        handleAuthError(error);
        setWishlist({
          data: null,
          loading: false,
          error: true,
        });
      }
    }

    void loadLoans();
    void loadReading();
    void loadReservations();
    void loadWishlist();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token, retryKey, handleAuthError]);

  const selectedReading = useMemo(() => {
    if (!reading.data || !loans.data) return null;
    return selectReadingBook(reading.data, loans.data);
  }, [reading.data, loans.data]);

  const selectedDueSoon = useMemo(() => {
    if (!loans.data) {
      return null;
    }
    return selectDueSoonLoan(loans.data, now);
  }, [loans.data, now]);

  const [metadata, setMetadata] = useState<Record<string, BookDetail | null>>(
    {},
  );

  const readingId = selectedReading?.openLibraryId ?? null;
  const dueSoonId = selectedDueSoon?.openLibraryId ?? null;

  useEffect(() => {
    const ids = [
      ...new Set(
        [readingId, dueSoonId].filter((id): id is string => Boolean(id)),
      ),
    ];

    if (ids.length === 0) return;

    const controller = new AbortController();
    let cancelled = false;

    async function loadMetadata() {
      const results = await Promise.allSettled(
        ids.map((id) => getBookDetails(id, controller.signal)),
      );

      if (cancelled) return;

      setMetadata((current) => {
        const next = { ...current };

        ids.forEach((id, index) => {
          const result = results[index];
          next[id] = result.status === "fulfilled" ? result.value : null;
        });

        return next;
      });
    }

    void loadMetadata();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [readingId, dueSoonId]);

  const featuredReading: FeaturedReading | null = selectedReading
    ? {
        ...selectedReading,
        book: metadata[selectedReading.openLibraryId] ?? null,
      }
    : null;

  const dueSoon: DueSoonLoan | null =
    selectedDueSoon && selectedDueSoon.openLibraryId
      ? {
          openLibraryId: selectedDueSoon.openLibraryId,
          book: metadata[selectedDueSoon.openLibraryId] ?? null,
          dueAt: selectedDueSoon.dueAt,
          isOverdue: new Date(selectedDueSoon.dueAt).getTime() < now,
        }
      : null;

  const statsLoading =
    loans.loading || reservations.loading || wishlist.loading;

  function retry() {
    setLoans(initialResource());
    setReading(initialResource());
    setReservations(initialResource());
    setWishlist(initialResource());
    setMetadata({});
    setRetryKey((value) => value + 1);
  }

  return (
    <LibraryActivitySummary
      reading={featuredReading}
      dueSoon={dueSoon}
      stats={{
        activeLoans: loans.data?.length ?? null,
        reservations: reservations.data,
        wishlist: wishlist.data,
      }}
      readingLoading={reading.loading || loans.loading}
      loansLoading={loans.loading}
      statsLoading={statsLoading}
      readingError={reading.error || loans.error}
      loansError={loans.error}
      statsError={loans.error || reservations.error || wishlist.error}
      onRetry={retry}
    />
  );
}

export default LibraryActivitySection;
