import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { ApiError } from "../../api/authApi";
import { getBookAvailability } from "../../api/bookInventoryApi";
import { borrowBook } from "../../api/loanApi";
import { AuthContext } from "../../contexts/AuthContext";
import type { AuthContextValue } from "../../contexts/AuthContext";
import type { BorrowResponse } from "../../types/loan";
import BookBorrowActions from "./BookBorrowActions";

jest.mock("../../api/bookInventoryApi", () => ({
  getBookAvailability: jest.fn(),
}));

jest.mock("../../api/authApi", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

jest.mock("../../api/loanApi", () => ({
  borrowBook: jest.fn(),
}));

const mockGetBookAvailability = getBookAvailability as jest.MockedFunction<
  typeof getBookAvailability
>;
const mockBorrowBook = borrowBook as jest.MockedFunction<typeof borrowBook>;

const availability = {
  openLibraryId: "OL1W",
  stock: 5,
  activeLoans: 0,
  availableCopies: 5,
  isAvailable: true,
};

const borrowResponse: BorrowResponse = {
  loan: {
    id: "loan-1",
    bookId: "book-1",
    openLibraryId: "OL1W",
    borrowedAt: "2026-01-01T00:00:00.000Z",
    dueAt: "2026-01-15T00:00:00.000Z",
    returnedAt: null,
    status: "ACTIVE",
  },
  availableCopies: 4,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function authValue(logout = jest.fn()): AuthContextValue {
  return {
    token: "token-1",
    user: {
      id: "user-1",
      name: "Reader",
      email: "reader@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout,
  };
}

function LoginProbe() {
  const location = useLocation();

  return (
    <div>
      <span>Login</span>
      <span>Expired: {String(location.state?.sessionExpired)}</span>
      <span>From: {location.state?.from?.pathname}</span>
    </div>
  );
}

function renderActions(auth: AuthContextValue, onBorrowSuccess = jest.fn()) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={["/catalog?q=react"]}>
        <Routes>
          <Route
            path="/catalog"
            element={
              <BookBorrowActions
                openLibraryId="OL1W"
                onBorrowSuccess={onBorrowSuccess}
              />
            }
          />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  mockGetBookAvailability.mockReset();
  mockBorrowBook.mockReset();
});

test("successful borrow updates the button and notifies the parent", async () => {
  const user = userEvent.setup();
  const onBorrowSuccess = jest.fn();
  mockGetBookAvailability.mockResolvedValue(availability);
  mockBorrowBook.mockResolvedValue(borrowResponse);

  renderActions(authValue(), onBorrowSuccess);

  await user.click(await screen.findByRole("button", { name: "Borrow book" }));

  expect(
    await screen.findByRole("button", { name: "Already borrowed" }),
  ).toBeDisabled();
  expect(onBorrowSuccess).toHaveBeenCalledWith("OL1W");
});

test("borrow completion after unmount does not notify the parent", async () => {
  const user = userEvent.setup();
  const pendingBorrow = deferred<BorrowResponse>();
  const onBorrowSuccess = jest.fn();
  mockGetBookAvailability.mockResolvedValue(availability);
  mockBorrowBook.mockReturnValue(pendingBorrow.promise);

  const { unmount } = renderActions(authValue(), onBorrowSuccess);

  await user.click(await screen.findByRole("button", { name: "Borrow book" }));
  unmount();

  await act(async () => {
    pendingBorrow.resolve(borrowResponse);
    await pendingBorrow.promise;
  });

  expect(onBorrowSuccess).not.toHaveBeenCalled();
});

test("a borrow 401 logs out and preserves the expired-session destination", async () => {
  const user = userEvent.setup();
  const logout = jest.fn();
  mockGetBookAvailability.mockResolvedValue(availability);
  mockBorrowBook.mockRejectedValue(new ApiError("Expired", 401));

  renderActions(authValue(logout));

  await user.click(await screen.findByRole("button", { name: "Borrow book" }));

  expect(await screen.findByText("Login")).toBeInTheDocument();
  expect(screen.getByText("Expired: true")).toBeInTheDocument();
  expect(screen.getByText("From: /catalog")).toBeInTheDocument();
  expect(logout).toHaveBeenCalledTimes(1);
});

test("a non-401 borrow error does not log out", async () => {
  const user = userEvent.setup();
  const logout = jest.fn();
  mockGetBookAvailability.mockResolvedValue(availability);
  mockBorrowBook.mockRejectedValue(new ApiError("Server error", 500));

  renderActions(authValue(logout));

  await user.click(await screen.findByRole("button", { name: "Borrow book" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
  expect(logout).not.toHaveBeenCalled();
});
