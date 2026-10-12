import { useState, type RefObject, type SyntheticEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./TopBar.module.css";
import { useAuth } from "../../hooks/useAuth";

interface TopBarProps {
  isMenuOpen: boolean;
  onMenuClick: () => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
}

function getInitials(name: string): string {
  if (!name) return "U";
  return name
    .trim()
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TopBar({ isMenuOpen, onMenuClick, menuButtonRef }: TopBarProps) {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const urlQuery =
    location.pathname === "/catalog" ? (searchParams.get("q") ?? "") : "";

  const [inputValue, setInputValue] = useState<string | null>(null);

  const query = inputValue ?? urlQuery;

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    const params = new URLSearchParams();
    params.set("q", trimmedQuery);
    params.set("type", "all");

    setInputValue(null);
    navigate(`/catalog?${params.toString()}`);
  };

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <header className={styles.topBar}>
      <button
        ref={menuButtonRef}
        className={styles.menuButton}
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={isMenuOpen}
        aria-controls="primary-navigation-drawer"
        onClick={onMenuClick}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      <form className={styles.searchForm} role="search" onSubmit={handleSubmit}>
        <label className={styles.visuallyHidden} htmlFor="global-search">
          Search books, authors, or keywords
        </label>

        <input
          id="global-search"
          className={styles.searchInput}
          type="search"
          value={query}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Search books, authors, or keywords..."
        />

        <button className={styles.searchButton} type="submit">
          Search
        </button>
      </form>

      <div className={styles.authActions}>
        {isLoading ? (
          <div
            className={styles.authButton}
            style={{ opacity: 0.6, cursor: "wait" }}
          >
            Loading...
          </div>
        ) : user ? (
          <>
            <div className={styles.userInfo} title={user.name}>
              <span className={styles.userAvatar} aria-hidden="true">
                {getInitials(user.name)}
              </span>
              <span className={styles.userName}>{user.name}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className={styles.authButton}
            >
              Log out
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className={`${styles.authButton} ${styles.authButtonPrimary}`}
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

export default TopBar;
