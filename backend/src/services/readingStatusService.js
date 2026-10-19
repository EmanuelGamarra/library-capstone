import sequelize from "../config/database.js";
import Book from "../models/Book.js";
import Loan from "../models/Loan.js";
import ReadingStatus from "../models/ReadingStatus.js";

function readingStatusError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toReadingStatusDto(openLibraryId, record) {
  if (!record) {
    return null;
  }

  return {
    openLibraryId,
    status: record.status,
    updatedAt: record.updatedAt,
  };
}

export async function getReadingStatus(userId, openLibraryId) {
  const book = await Book.findOne({
    where: { openLibraryId },
  });

  if (!book) {
    return {
      readingStatus: null,
      canEdit: false,
    };
  }

  const [record, activeLoan] = await Promise.all([
    ReadingStatus.findOne({
      where: {
        userId,
        bookId: book.id,
      },
    }),
    Loan.findOne({
      where: {
        userId,
        bookId: book.id,
        returnedAt: null,
      },
      attributes: ["id"],
    }),
  ]);

  return {
    readingStatus: toReadingStatusDto(openLibraryId, record),
    canEdit: activeLoan !== null,
  };
}

export async function updateReadingStatus(userId, openLibraryId, status) {
  const book = await Book.findOne({
    where: { openLibraryId },
  });

  if (!book) {
    throw readingStatusError("Book not found in library", 404);
  }

  return sequelize.transaction(async (transaction) => {
    const lockedBook = await Book.findByPk(book.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lockedBook) {
      throw readingStatusError("Book not found in library", 404);
    }

    const activeLoan = await Loan.findOne({
      where: {
        userId,
        bookId: lockedBook.id,
        returnedAt: null,
      },
      attributes: ["id"],
      transaction,
    });

    if (!activeLoan) {
      throw readingStatusError(
        "An active loan is required to update reading status",
        409,
      );
    }

    const [record] = await ReadingStatus.findOrCreate({
      where: {
        userId,
        bookId: lockedBook.id,
      },
      defaults: {
        status,
      },
      transaction,
    });

    if (record.status !== status) {
      record.status = status;
      await record.save({ transaction });
    }

    return {
      readingStatus: toReadingStatusDto(openLibraryId, record),
      canEdit: true,
    };
  });
}

export async function getMyBooksByReadingStatus(userId, status) {
  const records = await ReadingStatus.findAll({
    where: {
      userId,
      status,
    },
    include: [
      {
        model: Book,
        attributes: ["openLibraryId"],
      },
    ],
    order: [
      ["updatedAt", "DESC"],
      ["id", "DESC"],
    ],
  });

  return {
    items: records.map((record) => ({
      openLibraryId: record.Book.openLibraryId,
      status: record.status,
      updatedAt: record.updatedAt,
    })),
  };
}
