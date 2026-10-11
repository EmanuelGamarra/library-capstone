import { useState, type RefObject, type SyntheticEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./TopBar.module.css";

interface TopBarProps {
  isMenuOpen: boolean;
  onMenuClick: () => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
}

function TopBar({ isMenuOpen, onMenuClick, menuButtonRef }: TopBarProps) {
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
    </header>
  );
}

export default TopBar;
