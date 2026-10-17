import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import type { Loan } from "../../types/loan";

import LoanTable from "./LoanTable";

jest.mock("../books/BookCover", () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <span>Cover: {title}</span>,
}));

const activeLoan: Loan = {
  id: "loan-1",
  bookId: "book-1",
  openLibraryId: "OL123W",
  borrowedAt: "2026-10-01T12:00:00.000Z",
  dueAt: "2026-10-30T12:00:00.000Z",
  returnedAt: null,
  status: "ACTIVE",
};

const metadataById = {
  OL123W: {
    openLibraryId: "OL123W",
    title: "Clean Code",
    author: "Robert C. Martin",
    coverUrl: null,
  },
};

test("renders loan metadata and delegates the return action", async () => {
  const user = userEvent.setup();
  const onReturn = jest.fn();

  render(
    <MemoryRouter>
      <LoanTable
        loans={[activeLoan]}
        metadataById={metadataById}
        now={Date.parse("2026-10-16T12:00:00.000Z")}
        onReturn={onReturn}
      />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Clean Code" })).toHaveAttribute(
    "href",
    "/books/OL123W",
  );
  expect(screen.getByText("Robert C. Martin")).toBeInTheDocument();
  expect(screen.getByText("Active")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Return Clean Code" }));

  expect(onReturn).toHaveBeenCalledWith("loan-1");
});

test("renders returned loans as history without a return button", () => {
  const returnedLoan: Loan = {
    ...activeLoan,
    returnedAt: "2026-10-15T12:00:00.000Z",
    status: "RETURNED",
  };

  render(
    <MemoryRouter>
      <LoanTable
        loans={[returnedLoan]}
        metadataById={metadataById}
        now={Date.parse("2026-10-16T12:00:00.000Z")}
      />
    </MemoryRouter>,
  );

  expect(screen.getByText("Returned")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(
    screen.getByRole("columnheader", { name: "Return Date" }),
  ).toBeInTheDocument();
});
