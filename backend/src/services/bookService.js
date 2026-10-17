import sequelize from "../config/database.js";
import Book from "../models/Book.js";
import { reconcileReservationsForBook } from "./reservationService.js";
import { DEFAULT_BOOK_STOCK } from "../constants/bookConstants.js";

export async function getBookAvailability(openLibraryId) {
  const book = await Book.findOne({
    where: { openLibraryId },
  });

  if (!book) {
    return {
      openLibraryId,
      stock: DEFAULT_BOOK_STOCK,
      activeLoans: 0,
      physicalAvailableCopies: DEFAULT_BOOK_STOCK,
      reservedCopies: 0,
      availableCopies: DEFAULT_BOOK_STOCK,
      isAvailable: true,
    };
  }

  return sequelize.transaction(async (transaction) => {
    const lockedBook = await Book.findByPk(book.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lockedBook) {
      throw new Error("Book not found");
    }

    const inventory = await reconcileReservationsForBook(
      lockedBook,
      transaction,
    );

    const physicalAvailableCopies = Math.max(
      0,
      lockedBook.stock - inventory.activeLoans,
    );

    return {
      openLibraryId: lockedBook.openLibraryId,
      stock: lockedBook.stock,
      activeLoans: inventory.activeLoans,
      physicalAvailableCopies,
      reservedCopies: inventory.readyCount,
      availableCopies: inventory.freeCopies,
      isAvailable: inventory.freeCopies > 0,
    };
  });
}
