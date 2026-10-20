import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Link,
  MemoryRouter,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { getBookDetails } from "../api/openLibraryApi";
import type { BookDetail } from "../types/bookDetail";
import BookDetailPage from "./BookDetailPage";

jest.mock("../api/openLibraryApi", () => ({
  getBookDetails: jest.fn(),
}));

jest.mock("../api/loanApi", () => ({
  getMyActiveLoans: jest.fn(),
}));

jest.mock("../api/reservationApi", () => ({
  getMyReservations: jest.fn(),
}));

jest.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ token: null, isAuthenticated: false }),
}));

jest.mock("../hooks/useAuthErrorHandler", () => ({
  useAuthErrorHandler: () => jest.fn(() => false),
}));

jest.mock("../components/books/BookBorrowActions", () => ({
  __esModule: true,
  default: () => <div />,
}));

jest.mock("../components/books/ReadingTracker", () => ({
  __esModule: true,
  default: () => <div />,
}));

jest.mock("../components/books/WishlistButton", () => ({
  __esModule: true,
  default: () => <div />,
}));

const mockGetBookDetails = getBookDetails as jest.MockedFunction<
  typeof getBookDetails
>;

const makeBook = (id: string, title: string): BookDetail => ({
  id,
  title,
  authors: ["Author"],
  coverUrl: null,
  description: null,
  firstPublishYear: 2020,
  subjects: [],
});

function TestLayout() {
  return (
    <>
      <Link to="/books/OL222W">Next book</Link>
      <Outlet />
    </>
  );
}

test("an aborted stale request cannot overwrite the current book", async () => {
  const user = userEvent.setup();
  let resolveFirst!: (book: BookDetail) => void;
  const firstRequest = new Promise<BookDetail>((resolve) => {
    resolveFirst = resolve;
  });
  let firstSignal: AbortSignal | undefined;

  mockGetBookDetails.mockImplementation((id, signal) => {
    if (id === "OL111W") {
      firstSignal = signal;
      return firstRequest;
    }

    return Promise.resolve(makeBook("OL222W", "Current Book"));
  });

  render(
    <MemoryRouter initialEntries={["/books/OL111W"]}>
      <Routes>
        <Route element={<TestLayout />}>
          <Route path="/books/:bookId" element={<BookDetailPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  await user.click(screen.getByRole("link", { name: "Next book" }));

  expect(
    await screen.findByRole("heading", { name: "Current Book" }),
  ).toBeInTheDocument();
  expect(firstSignal?.aborted).toBe(true);

  await act(async () => {
    resolveFirst(makeBook("OL111W", "Stale Book"));
    await firstRequest;
  });

  expect(screen.queryByText("Stale Book")).not.toBeInTheDocument();
  expect(screen.getByText("Current Book")).toBeInTheDocument();
});
