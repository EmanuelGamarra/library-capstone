import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getMyWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../../api/wishlistApi";
import { ApiError } from "../../api/authApi";
import { useAuth } from "../../hooks/useAuth";
import { useAuthErrorHandler } from "../../hooks/useAuthErrorHandler";
import styles from "./WishlistButton.module.css";

interface WishlistButtonProps {
  openLibraryId: string;
}

function WishlistButton({ openLibraryId }: WishlistButtonProps) {
  const { token, isAuthenticated } = useAuth();
  const handleAuthError = useAuthErrorHandler();
  const location = useLocation();

  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const mountedRef = useRef(false);
  const contextKey = `${openLibraryId}:${token ?? "anonymous"}`;
  const contextRef = useRef(contextKey);

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

    async function loadWishlist() {
      setIsLoading(true);
      setError("");
      setMessage("");

      try {
        const response = await getMyWishlist(token!, controller.signal);

        if (!cancelled) {
          setIsSaved(
            response.items.some((item) => item.openLibraryId === openLibraryId),
          );
        }
      } catch (err) {
        if (cancelled) return;

        if (!handleAuthError(err)) {
          setError("Unable to load your wishlist.");
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
  }, [openLibraryId, token, isAuthenticated, retryKey, handleAuthError]);

  async function handleToggle() {
    if (!token || isLoading || isSaving || error) return;

    const requestContext = contextKey;
    const wasSaved = isSaved;

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      if (wasSaved) {
        await removeFromWishlist(openLibraryId, token);
      } else {
        await addToWishlist(openLibraryId, token);
      }

      if (!mountedRef.current || contextRef.current !== requestContext) {
        return;
      }

      setIsSaved(!wasSaved);
      setMessage(
        wasSaved
          ? "Book removed from your wishlist."
          : "Book added to your wishlist.",
      );
    } catch (err) {
      if (!mountedRef.current || contextRef.current !== requestContext) {
        return;
      }

      if (handleAuthError(err)) return;

      if (
        err instanceof ApiError &&
        (err.status === 404 || err.status === 409)
      ) {
        setError("Your wishlist has changed. Please refresh its status.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to update your wishlist.",
        );
      }
    } finally {
      if (mountedRef.current && contextRef.current === requestContext) {
        setIsSaving(false);
      }
    }
  }

  function retry() {
    setError("");
    setRetryKey((value) => value + 1);
  }

  if (!isAuthenticated) {
    return (
      <Link to="/login" state={{ from: location }} className={styles.loginLink}>
        Sign in to save this book
      </Link>
    );
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={`${styles.button} ${isSaved ? styles.saved : ""}`}
        onClick={() => void handleToggle()}
        disabled={isLoading || isSaving || Boolean(error)}
        aria-pressed={isSaved}
      >
        {isLoading
          ? "Checking wishlist..."
          : isSaving
            ? "Updating wishlist..."
            : isSaved
              ? "Remove from Wishlist"
              : "Add to Wishlist"}
      </button>

      {error && (
        <div className={styles.feedback}>
          <p className={styles.error} role="alert">
            {error}
          </p>
          <button type="button" className={styles.retryButton} onClick={retry}>
            Refresh wishlist status
          </button>
        </div>
      )}

      {message && (
        <p className={styles.success} role="status">
          {message}
        </p>
      )}
    </div>
  );
}

export default WishlistButton;
