import {
  BOOK_SORT_VALUES,
  type BookFilters,
  type BookSort,
} from "../types/bookSearch";

export const parseYearParam = (value: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return undefined;
  }

  return parsedValue;
};

export const getBookFiltersFromSearchParams = (
  searchParams: URLSearchParams,
): BookFilters => {
  const subject = searchParams.get("subject") || undefined;

  return {
    subject,
    yearFrom: parseYearParam(searchParams.get("yearFrom")),
    yearTo: parseYearParam(searchParams.get("yearTo")),
  };
};

export const hasActiveBookFilters = (filters: BookFilters): boolean => {
  return Boolean(
    filters.subject ||
    filters.yearFrom !== undefined ||
    filters.yearTo !== undefined,
  );
};

export const parseBookSort = (value: string | null): BookSort => {
  if (value && BOOK_SORT_VALUES.includes(value as BookSort)) {
    return value as BookSort;
  }

  return "relevance";
};
