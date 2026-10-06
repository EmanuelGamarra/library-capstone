import { useState, type SyntheticEvent } from "react";
import type { BookFilters } from "../../types/bookSearch";
import styles from "./FilterPanel.module.css";

interface FilterPanelProps {
  initialFilters?: BookFilters;
  onApply: (filters: BookFilters) => void;
  onClear: () => void;
}

const SUBJECT_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "fiction", label: "Fiction" },
  { value: "science", label: "Science" },
  { value: "history", label: "History" },
  { value: "biography", label: "Biography" },
  { value: "technology", label: "Technology" },
  { value: "art", label: "Art" },
  { value: "businsess", label: "Business" },
  { value: "children", label: "Children" },
  { value: "philosophy", label: "Philosophy" },
];

function FilterPanel({ initialFilters, onApply, onClear }: FilterPanelProps) {
  const [subject, setSubject] = useState(initialFilters?.subject ?? "");
  const [yearFrom, setYearFrom] = useState(
    initialFilters?.yearFrom?.toString() ?? "",
  );
  const [yearTo, setYearTo] = useState(
    initialFilters?.yearTo?.toString() ?? "",
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedYearFrom = yearFrom ? Number(yearFrom) : undefined;
    const parsedYearTo = yearTo ? Number(yearTo) : undefined;

    if (
      parsedYearFrom !== undefined &&
      parsedYearTo !== undefined &&
      parsedYearFrom > parsedYearTo
    ) {
      setValidationError(
        "Invalid year range: 'From' year cannot be greater than 'To' year.",
      );
      return;
    }

    const currentYear = new Date().getFullYear();

    if (
      parsedYearFrom !== undefined &&
      (parsedYearFrom < 0 || parsedYearFrom > currentYear)
    ) {
      setValidationError("Invalid 'From' year. Please enter a valid year.");
      return;
    }

    if (
      parsedYearTo !== undefined &&
      (parsedYearTo < 0 || parsedYearTo > currentYear)
    ) {
      setValidationError("Invalid 'To' year. Please enter a valid year.");
      return;
    }

    setValidationError(null);

    onApply({
      subject: subject || undefined,
      yearFrom: parsedYearFrom,
      yearTo: parsedYearTo,
    });
  };

  const handleClear = () => {
    setSubject("");
    setYearFrom("");
    setYearTo("");
    setValidationError(null);
    onClear();
  };

  return (
    <form className={styles.filterPanel} onSubmit={handleSubmit}>
      <div className={styles.filterHeader}>
        <div>
          <h2 className={styles.title}>Filters</h2>
          <p className={styles.description}>Refine your current search.</p>
        </div>

        <button
          className={styles.clearButton}
          type="button"
          onClick={handleClear}
        >
          Clear
        </button>
      </div>

      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="subject-filter">
            Category
          </label>

          <select
            id="subject-filter"
            className={styles.control}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          >
            {SUBJECT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="year-from-filter">
            From year
          </label>

          <input
            id="year-from-filter"
            className={styles.control}
            type="number"
            min="0"
            value={yearFrom}
            onChange={(event) => setYearFrom(event.target.value)}
            placeholder="e.g. 2000"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="year-to-filter">
            To year
          </label>

          <input
            id="year-to-filter"
            className={styles.control}
            type="number"
            min="0"
            value={yearTo}
            onChange={(event) => setYearTo(event.target.value)}
            placeholder="e.g. 2025"
          />
        </div>

        <button className={styles.applyButton} type="submit">
          Apply filters
        </button>
      </div>

      {validationError && (
        <p className={styles.error} role="alert">
          {validationError}
        </p>
      )}
    </form>
  );
}

export default FilterPanel;
