import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { cancelReservation, getMyReservations } from "../api/reservationApi";
import { borrowBook } from "../api/loanApi";
import { getBookMetadata } from "../api/openLibraryApi";
import { AuthContext } from "../contexts/AuthContext";
import type { AuthContextValue } from "../contexts/AuthContext";
import type { Reservation } from "../types/reservation";
import ReservationsPage from "./ReservationsPage";

jest.mock("../api/reservationApi", () => ({
  cancelReservation: jest.fn(),
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

jest.mock("../api/loanApi", () => ({
  borrowBook: jest.fn(),
}));

jest.mock("../api/openLibraryApi", () => ({
  getBookMetadata: jest.fn(),
}));

const mockCancelReservation = cancelReservation as jest.MockedFunction<
  typeof cancelReservation
>;
const mockGetMyReservations = getMyReservations as jest.MockedFunction<
  typeof getMyReservations
>;
const mockGetBookMetadata = getBookMetadata as jest.MockedFunction<
  typeof getBookMetadata
>;
const mockBorrowBook = borrowBook as jest.MockedFunction<typeof borrowBook>;

const pendingReservation: Reservation = {
  id: "reservation-1",
  bookId: "book-1",
  openLibraryId: "OL1W",
  status: "PENDING",
  createdAt: "2026-10-01T00:00:00.000Z",
  readyAt: null,
  expiresAt: null,
  fulfilledAt: null,
  cancelledAt: null,
};

const auth: AuthContextValue = {
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
  logout: jest.fn(),
};

test("successful cancellation moves a pending reservation to history", async () => {
  const user = userEvent.setup();
  const cancelledReservation: Reservation = {
    ...pendingReservation,
    status: "CANCELLED",
    cancelledAt: "2026-10-17T00:00:00.000Z",
  };

  mockGetMyReservations
    .mockResolvedValueOnce({ reservations: [pendingReservation] })
    .mockResolvedValueOnce({ reservations: [cancelledReservation] });
  mockCancelReservation.mockResolvedValue({
    reservation: cancelledReservation,
  });
  mockGetBookMetadata.mockResolvedValue({
    openLibraryId: "OL1W",
    title: "Reserved Book",
    author: "Author",
    coverUrl: null,
  });

  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <ReservationsPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  await user.click(
    await screen.findByRole("button", {
      name: "Cancel reservation for Reserved Book",
    }),
  );

  expect(
    await screen.findByText("Reservation cancelled successfully."),
  ).toBeInTheDocument();
  expect(await screen.findByText("CANCELLED")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", {
      name: "Cancel reservation for Reserved Book",
    }),
  ).not.toBeInTheDocument();
});

test("a READY reservation with an Edition ID cannot be borrowed", async () => {
  const invalidReservation: Reservation = {
    ...pendingReservation,
    openLibraryId: "OL123M",
    status: "READY",
    readyAt: "2026-10-17T00:00:00.000Z",
    expiresAt: "2026-10-19T00:00:00.000Z",
  };

  mockGetMyReservations.mockResolvedValue({
    reservations: [invalidReservation],
  });
  mockGetBookMetadata.mockRejectedValue(
    new Error("Invalid Open Library Work ID."),
  );

  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <ReservationsPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Borrow unavailable: invalid Open Library Work ID.",
  );
  expect(
    screen.queryByRole("button", { name: "Borrow OL123M" }),
  ).not.toBeInTheDocument();
  expect(mockBorrowBook).not.toHaveBeenCalled();
});
