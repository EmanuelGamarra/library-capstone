import type { BookFilters } from "../types/bookSearch";

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
