import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import BookCard from "./BookCard";

jest.mock("./BookCover", () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <span>Cover: {title}</span>,
}));

jest.mock("./BookBorrowActions", () => ({
  __esModule: true,
  default: () => <div data-testid="borrow-actions" />,
}));

const book = {
  id: "OL123W",
  title: "Clean Code",
  authors: ["Robert C. Martin"],
  firstPublishYear: 2008,
  coverUrl: null,
} as React.ComponentProps<typeof BookCard>["book"];

function LocationState() {
  const location = useLocation();
  const state = location.state as { searchMetadata?: typeof book } | null;

  return <span>Metadata: {state?.searchMetadata?.title ?? "missing"}</span>;
}

test("renders book information and passes Search metadata to book details", async () => {
  const user = userEvent.setup();

  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<BookCard book={book} />} />
        <Route path="/books/:bookId" element={<LocationState />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("heading", { name: "Clean Code" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Robert C. Martin")).toBeInTheDocument();
  expect(screen.getByText("First published 2008")).toBeInTheDocument();
  expect(screen.getByRole("link")).toHaveAttribute("href", "/books/OL123W");

  await user.click(screen.getByRole("link"));

  expect(screen.getByText("Metadata: Clean Code")).toBeInTheDocument();
});

test("renders fallback metadata when author and publication year are missing", () => {
  render(
    <MemoryRouter>
      <BookCard
        book={
          {
            ...book,
            authors: [],
            firstPublishYear: null,
          } as React.ComponentProps<typeof BookCard>["book"]
        }
      />
    </MemoryRouter>,
  );
  expect(screen.getByText("Unknown author")).toBeInTheDocument();
  expect(screen.getByText("Publication year unavailable")).toBeInTheDocument();
});
