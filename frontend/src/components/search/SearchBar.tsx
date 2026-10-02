import type { BookSearchType } from "../../types/bookSearch";
import { useState, type SyntheticEvent } from "react";
import styles from "./SearchBar.module.css";

interface SearchBarProps {
  initialQuery?: string;
  initialType?: BookSearchType;
  onSearch: (query: string, type: BookSearchType) => void;
}

function SearchBar({
  initialQuery = "",
  initialType = "all",
  onSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<BookSearchType>(initialType);

  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery);
  const [prevInitialType, setPrevInitialType] = useState(initialType);

  if (initialQuery !== prevInitialQuery) {
    setPrevInitialQuery(initialQuery);
    setQuery(initialQuery);
  }

  if (initialType !== prevInitialType) {
    setPrevInitialType(initialType);
    setType(initialType);
  }

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return;
    }

    onSearch(normalizedQuery, type);
  };

  return (
    <form className={styles.searchForm} onSubmit={handleSubmit}>
      <input
        className={styles.searchInput}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search books..."
        aria-label="Search books"
      />

      <select
        className={styles.searchTypeSelect}
        value={type}
        onChange={(event) => setType(event.target.value as BookSearchType)}
        aria-label="Search by"
      >
        <option value="all">All</option>
        <option value="title">Title</option>
        <option value="author">Author</option>
      </select>

      <button className={styles.searchButton} type="submit">
        Search
      </button>
    </form>
  );
}

export default SearchBar;
