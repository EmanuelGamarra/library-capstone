import Book from "../models/Book.js";
import WishlistItem from "../models/WishlistItem.js";
import { DEFAULT_BOOK_STOCK } from "../constants/bookConstants.js";
import { verifyOpenLibraryWork } from "./openLibraryService.js";

function wishlistError(message, statusCode) {
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

function serializeWishlistItem(item, openLibraryId) {
  return {
    id: item.id,
    openLibraryId,
    createdAt: item.createdAt,
  };
}

export async function getMyWishlist(userId) {
  const items = await WishlistItem.findAll({
    where: { userId },
    include: [
      {
        model: Book,
        attributes: ["openLibraryId"],
      },
    ],
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
  });

  return {
    items: items.map((item) =>
      serializeWishlistItem(item, item.Book.openLibraryId),
    ),
  };
}

export async function addToWishlist(userId, openLibraryId) {
  const book = await resolveBook(openLibraryId);

  const [item, created] = await WishlistItem.findOrCreate({
    where: {
      userId,
      bookId: book.id,
    },
    defaults: {
      userId,
      bookId: book.id,
    },
  });

  if (!created) {
    throw wishlistError("Book is already in your wishlist", 409);
  }

  return {
    item: serializeWishlistItem(item, book.openLibraryId),
  };
}

export async function removeFromWishlist(userId, openLibraryId) {
  const book = await Book.findOne({
    where: { openLibraryId },
  });

  if (!book) {
    throw wishlistError("Book not found in your wishlist", 404);
  }

  const deletedCount = await WishlistItem.destroy({
    where: {
      userId,
      bookId: book.id,
    },
  });

  if (deletedCount === 0) {
    throw wishlistError("Book not found in your wishlist", 404);
  }

  return {
    item: {
      openLibraryId,
    },
  };
}
