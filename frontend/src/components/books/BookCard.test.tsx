import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

test("renders book information and links to book details", () => {
  render(
    <MemoryRouter>
      <BookCard book={book} />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("heading", { name: "Clean Code" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Robert C. Martin")).toBeInTheDocument();
  expect(screen.getByText("First published 2008")).toBeInTheDocument();
  expect(screen.getByRole("link")).toHaveAttribute("href", "/books/OL123W");
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
