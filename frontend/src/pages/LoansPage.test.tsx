import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { ApiError } from "../api/authApi";
import { getMyLoans, returnBook } from "../api/loanApi";
import { getBookMetadata } from "../api/openLibraryApi";
import { AuthContext } from "../contexts/AuthContext";
import ProtectedRoute from "../routes/ProtectedRoutes";
import type { AuthContextValue } from "../contexts/AuthContext";
import type { Loan, ReturnResponse } from "../types/loan";
import LoansPage from "./LoansPage";

jest.mock("../api/loanApi", () => ({
  getMyLoans: jest.fn(),
  returnBook: jest.fn(),
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

jest.mock("../api/openLibraryApi", () => ({
  getBookMetadata: jest.fn(),
}));

const mockGetMyLoans = getMyLoans as jest.MockedFunction<typeof getMyLoans>;
const mockReturnBook = returnBook as jest.MockedFunction<typeof returnBook>;
const mockGetBookMetadata = getBookMetadata as jest.MockedFunction<
  typeof getBookMetadata
>;

const activeLoan: Loan = {
  id: "loan-1",
  bookId: "book-1",
  openLibraryId: "OL1W",
  borrowedAt: "2026-01-01T00:00:00.000Z",
  dueAt: "2026-12-31T00:00:00.000Z",
  returnedAt: null,
  status: "ACTIVE",
};

const returnResponse: ReturnResponse = {
  loan: {
    ...activeLoan,
    returnedAt: "2026-10-16T12:00:00.000Z",
    status: "RETURNED",
  },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
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

function StatefulAuth({
  children,
  onLogout,
}: {
  children: ReactNode;
  onLogout: () => void;
}) {
  const [token, setToken] = useState<string | null>("token-1");
  const [user, setUser] = useState<AuthContextValue["user"]>({
    id: "user-1",
    name: "Reader",
    email: "reader@example.com",
    createdAt: "2026-01-01T00:00:00.000Z",
  });

  const value: AuthContextValue = {
    token,
    user,
    isAuthenticated: user !== null,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: () => {
      onLogout();
      setToken(null);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function renderProtectedLoans(onLogout = jest.fn()) {
  return render(
    <StatefulAuth onLogout={onLogout}>
      <MemoryRouter initialEntries={["/loans"]}>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/loans" element={<LoansPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </StatefulAuth>,
  );
}

beforeEach(() => {
  mockGetMyLoans.mockReset();
  mockReturnBook.mockReset();
  mockGetBookMetadata.mockReset();
  mockGetBookMetadata.mockResolvedValue({
    openLibraryId: "OL1W",
    title: "Book One",
    author: "Author",
    coverUrl: null,
  });
});

test("a loading 401 preserves session-expired state through ProtectedRoute", async () => {
  const logout = jest.fn();
  mockGetMyLoans.mockRejectedValue(new ApiError("Expired", 401));

  renderProtectedLoans(logout);

  expect(await screen.findByText("Login")).toBeInTheDocument();
  expect(screen.getByText("Expired: true")).toBeInTheDocument();
  expect(screen.getByText("From: /loans")).toBeInTheDocument();
  expect(logout).toHaveBeenCalledTimes(1);
});

test("a return 401 logs out and preserves the intended destination", async () => {
  const user = userEvent.setup();
  const logout = jest.fn();
  mockGetMyLoans.mockResolvedValue({ loans: [activeLoan] });
  mockReturnBook.mockRejectedValue(new ApiError("Expired", 401));

  renderProtectedLoans(logout);

  await user.click(
    await screen.findByRole("button", { name: "Return Book One" }),
  );

  expect(await screen.findByText("Login")).toBeInTheDocument();
  expect(screen.getByText("Expired: true")).toBeInTheDocument();
  expect(screen.getByText("From: /loans")).toBeInTheDocument();
  expect(logout).toHaveBeenCalledTimes(1);
});

test("a non-401 loading error does not log out", async () => {
  const logout = jest.fn();
  mockGetMyLoans.mockRejectedValue(new ApiError("Server error", 500));

  renderProtectedLoans(logout);

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to load your loans.",
  );
  expect(logout).not.toHaveBeenCalled();
});

test("renders loans before optional book metadata finishes loading", async () => {
  const pendingMetadata =
    deferred<Awaited<ReturnType<typeof getBookMetadata>>>();
  mockGetMyLoans.mockResolvedValue({ loans: [activeLoan] });
  mockGetBookMetadata.mockReturnValue(pendingMetadata.promise);

  renderProtectedLoans();

  expect(
    await screen.findByRole("button", { name: "Return OL1W" }),
  ).toBeEnabled();
  expect(screen.queryByText("Loading your loans...")).not.toBeInTheDocument();

  await act(async () => {
    pendingMetadata.resolve({
      openLibraryId: "OL1W",
      title: "Book One",
      author: "Author",
      coverUrl: null,
    });
    await pendingMetadata.promise;
  });

  expect(
    await screen.findByRole("button", { name: "Return Book One" }),
  ).toBeEnabled();
});

test("a late return 401 after unmount does not trigger logout", async () => {
  const user = userEvent.setup();
  const logout = jest.fn();
  const pendingReturn = deferred<ReturnResponse>();
  mockGetMyLoans.mockResolvedValue({ loans: [activeLoan] });
  mockReturnBook.mockReturnValue(pendingReturn.promise);

  const { unmount } = renderProtectedLoans(logout);

  await user.click(
    await screen.findByRole("button", { name: "Return Book One" }),
  );
  unmount();

  await act(async () => {
    pendingReturn.reject(new ApiError("Expired", 401));
    await Promise.resolve();
  });

  expect(logout).not.toHaveBeenCalled();
});

test("a successful return moves the loan to history and resets the action", async () => {
  const user = userEvent.setup();
  mockGetMyLoans.mockResolvedValue({ loans: [activeLoan] });
  mockReturnBook.mockResolvedValue(returnResponse);

  renderProtectedLoans();

  await user.click(
    await screen.findByRole("button", { name: "Return Book One" }),
  );

  expect(
    await screen.findByText("Book returned successfully."),
  ).toBeInTheDocument();
  expect(screen.getByText("Returned")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Return Book One" }),
  ).not.toBeInTheDocument();
});
