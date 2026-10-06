import type { BookSort } from "../../types/bookSearch";
import styles from "./SortSelect.module.css";

interface SortSelectProps {
  value: BookSort;
  onChange: (sort: BookSort) => void;
}

function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor="book-sort">
        Sort by
      </label>

      <select
        id="book-sort"
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value as BookSort)}
      >
        <option value="relevance">Relevance</option>

        <option value="newest">Newest first</option>

        <option value="oldest">Oldest first</option>
      </select>
    </div>
  );
}

export default SortSelect;
