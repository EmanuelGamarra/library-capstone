import Book from "../models/Book.js";
import Loan from "../models/Loan.js";

export const DEFAULT_BOOK_STOCK = 5;

export async function getBookAvailability(openLibraryId) {
  const book = await Book.findOne({
    where: { openLibraryId },
  });

  if (!book) {
    return {
      openLibraryId,
      stock: DEFAULT_BOOK_STOCK,
      activeLoans: 0,
      availableCopies: DEFAULT_BOOK_STOCK,
      isAvailable: true,
    };
  }

  const activeLoans = await Loan.count({
    where: {
      bookId: book.id,
      returnedAt: null,
    },
  });

  const availableCopies = Math.max(0, book.stock - activeLoans);

  return {
    openLibraryId: book.openLibraryId,
    stock: book.stock,
    activeLoans,
    availableCopies,
    isAvailable: availableCopies > 0,
  };
}
