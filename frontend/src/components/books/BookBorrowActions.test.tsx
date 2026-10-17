import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { ComponentProps } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { ApiError } from "../../api/authApi";
import { getBookAvailability } from "../../api/bookInventoryApi";
import { borrowBook } from "../../api/loanApi";
import { createReservation } from "../../api/reservationApi";
import { AuthContext } from "../../contexts/AuthContext";
import type { AuthContextValue } from "../../contexts/AuthContext";
import type { BorrowResponse } from "../../types/loan";
import type { Reservation } from "../../types/reservation";
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

jest.mock("../../api/reservationApi", () => ({
  createReservation: jest.fn(),
}));

const mockGetBookAvailability = getBookAvailability as jest.MockedFunction<
  typeof getBookAvailability
>;
const mockBorrowBook = borrowBook as jest.MockedFunction<typeof borrowBook>;
const mockCreateReservation = createReservation as jest.MockedFunction<
  typeof createReservation
>;

const availability = {
  openLibraryId: "OL1W",
  stock: 5,
  activeLoans: 0,
  physicalAvailableCopies: 5,
  reservedCopies: 0,
  availableCopies: 5,
  isAvailable: true,
};

const pendingReservation: Reservation = {
  id: "reservation-1",
  bookId: "book-1",
  openLibraryId: "OL1W",
  status: "PENDING",
  createdAt: "2026-01-01T00:00:00.000Z",
  readyAt: null,
  expiresAt: null,
  fulfilledAt: null,
  cancelledAt: null,
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

type ActionProps = Omit<
  ComponentProps<typeof BookBorrowActions>,
  "openLibraryId"
>;

function renderActions(auth: AuthContextValue, props: ActionProps = {}) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={["/catalog?q=react"]}>
        <Routes>
          <Route
            path="/catalog"
            element={<BookBorrowActions openLibraryId="OL1W" {...props} />}
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
  mockCreateReservation.mockReset();
});

test("successful borrow updates the button and notifies the parent", async () => {
  const user = userEvent.setup();
  const onBorrowSuccess = jest.fn();
  mockGetBookAvailability.mockResolvedValue(availability);
  mockBorrowBook.mockResolvedValue(borrowResponse);

  renderActions(authValue(), { onBorrowSuccess });

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

  const { unmount } = renderActions(authValue(), { onBorrowSuccess });

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

test("unavailable physical stock can be reserved and becomes pending", async () => {
  const user = userEvent.setup();
  mockGetBookAvailability.mockResolvedValue({
    ...availability,
    activeLoans: 5,
    physicalAvailableCopies: 0,
    availableCopies: 0,
    isAvailable: false,
  });
  mockCreateReservation.mockResolvedValue({
    reservation: pendingReservation,
  });

  function ReservationHarness() {
    const [reservation, setReservation] = useState<Reservation>();

    return (
      <BookBorrowActions
        openLibraryId="OL1W"
        reservation={reservation}
        onReservationSuccess={setReservation}
      />
    );
  }

  render(
    <AuthContext.Provider value={authValue()}>
      <MemoryRouter>
        <ReservationHarness />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  await user.click(await screen.findByRole("button", { name: "Reserve book" }));

  expect(
    await screen.findByRole("button", { name: "Reservation pending" }),
  ).toBeDisabled();
});

test("a user can reserve when the remaining physical copy belongs to a READY reservation", async () => {
  const user = userEvent.setup();
  mockGetBookAvailability.mockResolvedValue({
    ...availability,
    activeLoans: 4,
    physicalAvailableCopies: 1,
    reservedCopies: 1,
    availableCopies: 0,
    isAvailable: false,
  });
  mockCreateReservation.mockResolvedValue({
    reservation: pendingReservation,
  });

  renderActions(authValue());

  await user.click(await screen.findByRole("button", { name: "Reserve book" }));

  expect(mockCreateReservation).toHaveBeenCalledWith("OL1W", "token-1");
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Reservation created successfully.",
  );
});

test("READY owner can borrow when the reserved copy is not publicly available", async () => {
  const user = userEvent.setup();
  const onBorrowSuccess = jest.fn();
  mockGetBookAvailability.mockResolvedValue({
    ...availability,
    physicalAvailableCopies: 1,
    reservedCopies: 1,
    availableCopies: 0,
    isAvailable: false,
  });
  mockBorrowBook.mockResolvedValue(borrowResponse);

  renderActions(authValue(), {
    reservation: {
      ...pendingReservation,
      status: "READY",
      readyAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-03T00:00:00.000Z",
    },
    onBorrowSuccess,
  });

  await user.click(
    await screen.findByRole("button", { name: "Ready to borrow" }),
  );

  expect(
    await screen.findByRole("button", { name: "Already borrowed" }),
  ).toBeDisabled();
  expect(onBorrowSuccess).toHaveBeenCalledWith("OL1W");
});

test("a READY conflict requests fresh reservation ownership", async () => {
  const user = userEvent.setup();
  const onReservationRefresh = jest.fn();
  mockGetBookAvailability.mockResolvedValue({
    ...availability,
    physicalAvailableCopies: 1,
    reservedCopies: 1,
    availableCopies: 0,
    isAvailable: false,
  });
  mockBorrowBook.mockRejectedValue(new ApiError("Reservation expired", 409));

  renderActions(authValue(), {
    reservation: {
      ...pendingReservation,
      status: "READY",
      readyAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-03T00:00:00.000Z",
    },
    onReservationRefresh,
  });

  await user.click(
    await screen.findByRole("button", { name: "Ready to borrow" }),
  );

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Reservation expired",
  );
  expect(onReservationRefresh).toHaveBeenCalledTimes(1);
});
