import sequelize from "../config/database.js";
import Book from "../models/Book.js";
import Loan from "../models/Loan.js";
import { DEFAULT_BOOK_STOCK } from "./bookService.js";
import { verifyOpenLibraryWork } from "./openLibraryService.js";

const LOAN_DURATION_DAYS = 14;

function loanError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function resolveBook(openLibraryId) {
  const existingBook = await Book.findOne({
    where: { openLibraryId },
  });

  if (existingBook) {
    return existingBook;
  }

  await verifyOpenLibraryWork(openLibraryId);

  const [book] = await Book.findOrCreate({
    where: { openLibraryId },
    defaults: { stock: DEFAULT_BOOK_STOCK },
  });

  return book;
}

export async function borrowBook(userId, openLibraryId) {
  const book = await resolveBook(openLibraryId);

  return sequelize.transaction(async (transaction) => {
    const lockedBook = await Book.findByPk(book.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lockedBook) {
      throw loanError("Book not found", 404);
    }

    const existingLoan = await Loan.findOne({
      where: {
        userId,
        bookId: lockedBook.id,
        returnedAt: null,
      },
      transaction,
    });

    if (existingLoan) {
      throw loanError("You already have an active loan for this book", 409);
    }

    const activeLoans = await Loan.count({
      where: {
        bookId: lockedBook.id,
        returnedAt: null,
      },
      transaction,
    });

    if (activeLoans >= lockedBook.stock) {
      throw loanError("No copies available", 409);
    }

    const borrowedAt = new Date();
    const dueAt = new Date(
      borrowedAt.getTime() + LOAN_DURATION_DAYS * 24 * 60 * 60 * 1000,
    );

    const loan = await Loan.create(
      {
        userId,
        bookId: lockedBook.id,
        borrowedAt,
        dueAt,
        returnedAt: null,
      },
      { transaction },
    );

    return {
      loan: {
        id: loan.id,
        bookId: lockedBook.id,
        openLibraryId: lockedBook.openLibraryId,
        borrowedAt: loan.borrowedAt,
        dueAt: loan.dueAt,
        returnedAt: loan.returnedAt,
        status: "ACTIVE",
      },
      availableCopies: lockedBook.stock - activeLoans - 1,
    };
  });
}

export async function returnBook(userId, loanId) {
  return sequelize.transaction(async (transaction) => {
    const loan = await Loan.findByPk(loanId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!loan) {
      throw loanError("Loan not found", 404);
    }

    if (loan.userId !== userId) {
      throw loanError("You cannot return another user's loan", 403);
    }

    if (loan.returnedAt !== null) {
      throw loanError("Loan already returned", 409);
    }

    loan.returnedAt = new Date();
    await loan.save({ transaction });

    return {
      loan: {
        id: loan.id,
        bookId: loan.bookId,
        borrowedAt: loan.borrowedAt,
        dueAt: loan.dueAt,
        returnedAt: loan.returnedAt,
        status: "RETURNED",
      },
    };
  });
}

export async function getMyActiveLoans(userId) {
  const loans = await Loan.findAll({
    where: {
      userId,
      returnedAt: null,
    },
    include: [
      {
        model: Book,
        attributes: ["openLibraryId"],
      },
    ],
    order: [["borrowedAt", "DESC"]],
  });

  return {
    loans: loans.map((loan) => ({
      id: loan.id,
      bookId: loan.bookId,
      openLibraryId: loan.Book.openLibraryId,
      borrowedAt: loan.borrowedAt,
      dueAt: loan.dueAt,
      returnedAt: loan.returnedAt,
      status: loan.dueAt < new Date() ? "OVERDUE" : "ACTIVE",
    })),
  };
}
