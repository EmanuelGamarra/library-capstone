import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { getMyActiveLoans } from "../api/loanApi";
import { getMyReservations } from "../api/reservationApi";
import { AuthContext } from "../contexts/AuthContext";
import { useBookSearch } from "../hooks/useBookSearch";
import type { AuthContextValue } from "../contexts/AuthContext";
import type { LoansResponse } from "../types/loan";
import CatalogPage from "./CatalogPage";

jest.mock("../api/loanApi", () => ({
  getMyActiveLoans: jest.fn(),
}));

jest.mock("../api/reservationApi", () => ({
  getMyReservations: jest.fn(),
}));

jest.mock("../api/authApi", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

jest.mock("../hooks/useBookSearch", () => ({
  useBookSearch: jest.fn(),
}));

jest.mock("../components/books/BookGrid", () => ({
  __esModule: true,
  default: ({
    borrowedIds,
    borrowedStatus,
    onReservationRefresh,
  }: {
    borrowedIds?: ReadonlySet<string>;
    borrowedStatus?: string;
    onReservationRefresh?: () => void;
  }) => (
    <div>
      <span>Ownership: {borrowedStatus}</span>
      <span>Borrowed: {[...(borrowedIds ?? [])].join(",") || "none"}</span>
      <button type="button" onClick={onReservationRefresh}>
        Refresh reservation state
      </button>
    </div>
  ),
}));

jest.mock("../components/search/SearchBar", () => ({
  __esModule: true,
  default: ({ onSearch }: { onSearch: (query: string, type: "all") => void }) => (
    <button type="button" onClick={() => onSearch("react", "all")}>
      Change search
    </button>
  ),
}));

jest.mock("../components/search/FilterPanel", () => ({
  __esModule: true,
  default: ({
    onApply,
  }: {
    onApply: (filters: { subject: string }) => void;
  }) => (
    <button type="button" onClick={() => onApply({ subject: "science" })}>
      Change filters
    </button>
  ),
}));

jest.mock("../components/search/SortSelect", () => ({
  __esModule: true,
  default: ({ onChange }: { onChange: (sort: "newest") => void }) => (
    <button type="button" onClick={() => onChange("newest")}>
      Change sort
    </button>
  ),
}));

jest.mock("../components/search/Pagination", () => ({
  __esModule: true,
  default: ({ onPageChange }: { onPageChange: (page: number) => void }) => (
    <button type="button" onClick={() => onPageChange(2)}>
      Change page
    </button>
  ),
}));

jest.mock("../components/common/CatalogState", () => ({
  __esModule: true,
  default: () => null,
}));

const mockGetMyActiveLoans = getMyActiveLoans as jest.MockedFunction<
  typeof getMyActiveLoans
>;
const mockGetMyReservations = getMyReservations as jest.MockedFunction<
  typeof getMyReservations
>;
const mockUseBookSearch = useBookSearch as jest.MockedFunction<
  typeof useBookSearch
>;

function authValue(token: string): AuthContextValue {
  return {
    token,
    user: {
      id: token,
      name: "Reader",
      email: `${token}@example.com`,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function renderCatalog(auth: AuthContextValue) {
  return (
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={["/catalog"]}>
        <CatalogPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: jest.fn(),
  });
});

test("catalog navigation does not refetch ownership, but a session change does", async () => {
  const user = userEvent.setup();
  const secondSession = deferred<LoansResponse>();

  mockUseBookSearch.mockReturnValue({
    books: [
      {
        id: "OL1W",
        title: "Book",
        authors: [],
        firstPublishYear: null,
        coverUrl: null,
      },
    ],
    totalResults: 100,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });
  mockGetMyActiveLoans
    .mockResolvedValueOnce({
      loans: [
        {
          id: "loan-1",
          bookId: "book-1",
          openLibraryId: "OL1W",
          borrowedAt: "2026-01-01T00:00:00.000Z",
          dueAt: "2026-01-15T00:00:00.000Z",
          returnedAt: null,
          status: "ACTIVE",
        },
      ],
    })
    .mockResolvedValueOnce({ loans: [] })
    .mockReturnValueOnce(secondSession.promise);
  mockGetMyReservations.mockResolvedValue({ reservations: [] });

  const { rerender } = render(renderCatalog(authValue("token-1")));

  await waitFor(() => expect(mockGetMyActiveLoans).toHaveBeenCalledTimes(1));
  expect(mockGetMyReservations).toHaveBeenCalledTimes(1);
  expect(await screen.findByText("Borrowed: OL1W")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Change search" }));
  await user.click(screen.getByRole("button", { name: "Change filters" }));
  await user.click(screen.getByRole("button", { name: "Change sort" }));
  await user.click(screen.getByRole("button", { name: "Change page" }));

  expect(mockGetMyActiveLoans).toHaveBeenCalledTimes(1);
  expect(mockGetMyReservations).toHaveBeenCalledTimes(1);

  await user.click(
    screen.getByRole("button", { name: "Refresh reservation state" }),
  );
  await waitFor(() => expect(mockGetMyActiveLoans).toHaveBeenCalledTimes(2));
  expect(mockGetMyReservations).toHaveBeenCalledTimes(2);

  rerender(renderCatalog(authValue("token-2")));

  await waitFor(() => expect(mockGetMyActiveLoans).toHaveBeenCalledTimes(3));
  expect(mockGetMyReservations).toHaveBeenCalledTimes(3);
  expect(screen.getByText("Ownership: loading")).toBeInTheDocument();
  expect(screen.getByText("Borrowed: none")).toBeInTheDocument();

  await act(async () => {
    secondSession.resolve({ loans: [] });
    await secondSession.promise;
  });

  expect(await screen.findByText("Ownership: ready")).toBeInTheDocument();
});
