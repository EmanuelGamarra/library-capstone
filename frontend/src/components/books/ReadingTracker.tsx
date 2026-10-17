import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getReadingStatus,
  updateReadingStatus,
} from "../../api/readingStatusApi";
import { ApiError } from "../../api/authApi";
import { useAuth } from "../../hooks/useAuth";
import { useAuthErrorHandler } from "../../hooks/useAuthErrorHandler";
import type {
  ReadingStatus,
  ReadingStatusResponse,
} from "../../types/readingStatus";
import styles from "./ReadingTracker.module.css";

interface ReadingTrackerProps {
  openLibraryId: string;
}

function ReadingTracker({ openLibraryId }: ReadingTrackerProps) {
  const { token, isAuthenticated } = useAuth();
  const handleAuthError = useAuthErrorHandler();
  const location = useLocation();

  const contextKey = `${openLibraryId}:${token ?? "anonymous"}`;
  const contextRef = useRef(contextKey);
  const mountedRef = useRef(false);

  const [data, setData] = useState<ReadingStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useLayoutEffect(() => {
    contextRef.current = contextKey;
  }, [contextKey]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadStatus() {
      setIsLoading(true);
      setData(null);
      setError("");
      setMessage("");

      try {
        const result = await getReadingStatus(
          openLibraryId,
          token!,
          controller.signal,
        );

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (cancelled) return;

        if (!handleAuthError(err)) {
          setError("Unable to load reading status.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [openLibraryId, token, isAuthenticated, retryKey, handleAuthError]);

  async function handleStatusChange(status: ReadingStatus) {
    if (
      !token ||
      !data?.canEdit ||
      isSaving ||
      data.readingStatus?.status === status
    ) {
      return;
    }

    const requestContext = contextKey;

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const result = await updateReadingStatus(openLibraryId, status, token);

      if (!mountedRef.current || contextRef.current !== requestContext) {
        return;
      }

      setData(result);
      setMessage("Reading status updated successfully.");
    } catch (err) {
      if (!mountedRef.current || contextRef.current !== requestContext) {
        return;
      }

      if (handleAuthError(err)) return;

      if (err instanceof ApiError && err.status === 409) {
        setData((current) =>
          current ? { ...current, canEdit: false } : current,
        );
        setError(
          "Your active loan could not be verified. Refresh your status.",
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to update reading status.",
        );
      }
    } finally {
      if (mountedRef.current && contextRef.current === requestContext) {
        setIsSaving(false);
      }
    }
  }

  const status = data?.readingStatus?.status ?? null;
  const canEdit = data?.canEdit === true;

  return (
    <section className={styles.tracker} aria-labelledby="reading-tracker-title">
      <div className={styles.heading}>
        <h2 id="reading-tracker-title">Reading Status</h2>
        <p>Keep track of your reading progress.</p>
      </div>

      {!isAuthenticated ? (
        <p className={styles.helpText}>
          <Link
            to="/login"
            state={{ from: location }}
            className={styles.loginLink}
          >
            Sign in
          </Link>{" "}
          to manage your reading status.
        </p>
      ) : isLoading ? (
        <p className={styles.helpText} role="status">
          Loading reading status...
        </p>
      ) : !data ? (
        <div className={styles.feedback}>
          <p className={styles.error} role="alert">
            {error || "Reading status unavailable."}
          </p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => setRetryKey((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <p className={styles.currentStatus}>
            Current status:{" "}
            <strong>
              {status === "READING"
                ? "Reading"
                : status === "COMPLETED"
                  ? "Completed"
                  : "Not tracked"}
            </strong>
          </p>

          <div
            className={styles.options}
            role="group"
            aria-label="Reading status options"
          >
            <button
              type="button"
              className={`${styles.option} ${status === "READING" ? styles.selected : ""}`}
              aria-pressed={status === "READING"}
              disabled={!canEdit || isSaving || status === "READING"}
              onClick={() => void handleStatusChange("READING")}
            >
              Reading
            </button>

            <button
              type="button"
              className={`${styles.option} ${status === "COMPLETED" ? styles.selected : ""}`}
              aria-pressed={status === "COMPLETED"}
              disabled={!canEdit || isSaving || status === "COMPLETED"}
              onClick={() => void handleStatusChange("COMPLETED")}
            >
              Completed
            </button>
          </div>

          {!canEdit && (
            <p className={styles.helpText}>
              An active loan is required to change your reading status.
            </p>
          )}

          {isSaving && (
            <p className={styles.helpText} role="status">
              Saving...
            </p>
          )}

          {error && (
            <div className={styles.feedback}>
              <p className={styles.error} role="alert">
                {error}
              </p>
              <button
                type="button"
                className={styles.retryButton}
                onClick={() => setRetryKey((value) => value + 1)}
              >
                Refresh status
              </button>
            </div>
          )}

          {message && (
            <p className={styles.success} role="status">
              {message}
            </p>
          )}
        </>
      )}
    </section>
  );
}

export default ReadingTracker;
