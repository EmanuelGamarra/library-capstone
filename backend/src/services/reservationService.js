import { Op } from "sequelize";
import { validate as isUuid } from "uuid";
import sequelize from "../config/database.js";
import Book from "../models/Book.js";
import Loan from "../models/Loan.js";
import Reservation, {
  RESERVATION_STATUS as STATUS,
} from "../models/Reservation.js";
import { DEFAULT_BOOK_STOCK } from "../constants/bookConstants.js";
import { verifyOpenLibraryWork } from "./openLibraryService.js";

const READY_DURATION_MS = 48 * 60 * 60 * 1000;
const ACTIVE_STATUSES = [STATUS.PENDING, STATUS.READY];
const OPEN_LIBRARY_WORK_ID = /^OL[0-9]+W$/;

function reservationError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function resolveBook(openLibraryId) {
  const existing = await Book.findOne({
    where: { openLibraryId },
  });

  if (existing) return existing;

  await verifyOpenLibraryWork(openLibraryId);

  const [book] = await Book.findOrCreate({
    where: { openLibraryId },
    defaults: { stock: DEFAULT_BOOK_STOCK },
  });

  return book;
}

function serializeReservation(reservation, openLibraryId) {
  return {
    id: reservation.id,
    bookId: reservation.bookId,
    openLibraryId,
    status: reservation.status,
    createdAt: reservation.createdAt,
    readyAt: reservation.readyAt,
    expiresAt: reservation.expiresAt,
    fulfilledAt: reservation.fulfilledAt,
    cancelledAt: reservation.cancelledAt,
  };
}

export async function reconcileReservationsForBook(
  book,
  transaction,
  now = new Date(),
) {
  if (!transaction) {
    throw new Error("Reservation reconciliation requires a transaction");
  }

  const expiredReservations = await Reservation.findAll({
    where: {
      bookId: book.id,
      status: STATUS.READY,
      expiresAt: { [Op.lte]: now },
    },
    transaction,
  });

  await Promise.all(
    expiredReservations.map((reservation) => {
      reservation.status = STATUS.EXPIRED;
      return reservation.save({ transaction });
    }),
  );

  const activeLoans = await Loan.count({
    where: {
      bookId: book.id,
      returnedAt: null,
    },
    transaction,
  });

  const readyCount = await Reservation.count({
    where: {
      bookId: book.id,
      status: STATUS.READY,
    },
    transaction,
  });

  const freeCopies = Math.max(0, book.stock - activeLoans - readyCount);

  if (freeCopies === 0) {
    return { activeLoans, readyCount, freeCopies: 0 };
  }

  const pendingReservations = await Reservation.findAll({
    where: {
      bookId: book.id,
      status: STATUS.PENDING,
    },
    order: [
      ["createdAt", "ASC"],
      ["id", "ASC"],
    ],
    limit: freeCopies,
    transaction,
  });

  await Promise.all(
    pendingReservations.map((reservation) => {
      reservation.status = STATUS.READY;
      reservation.readyAt = now;
      reservation.expiresAt = new Date(now.getTime() + READY_DURATION_MS);
      return reservation.save({ transaction });
    }),
  );

  const promotedCount = pendingReservations.length;

  return {
    activeLoans,
    readyCount: readyCount + promotedCount,
    freeCopies: freeCopies - promotedCount,
  };
}

export async function createReservation(userId, openLibraryId) {
  if (!OPEN_LIBRARY_WORK_ID.test(openLibraryId)) {
    throw reservationError("Invalid Open Library work ID", 400);
  }
  const book = await resolveBook(openLibraryId);

  const outcome = await sequelize.transaction(async (transaction) => {
    const lockedBook = await Book.findByPk(book.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lockedBook) {
      throw reservationError("Book not found", 404);
    }

    await reconcileReservationsForBook(lockedBook, transaction);

    const existingReservation = await Reservation.findOne({
      where: {
        userId,
        bookId: lockedBook.id,
        status: { [Op.in]: ACTIVE_STATUSES },
      },
      transaction,
    });

    if (existingReservation) {
      return {
        error: reservationError(
          "You already have an active reservation for this book",
          409,
        ),
      };
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
      return {
        error: reservationError(
          "You already have an active loan for this book",
          409,
        ),
      };
    }

    const activeLoans = await Loan.count({
      where: {
        bookId: lockedBook.id,
        returnedAt: null,
      },
      transaction,
    });

    if (activeLoans < lockedBook.stock) {
      return {
        error: reservationError(
          "Copies are available; borrow the book instead",
          409,
        ),
      };
    }

    const reservation = await Reservation.create(
      {
        userId,
        bookId: lockedBook.id,
        status: STATUS.PENDING,
      },
      { transaction },
    );

    return {
      reservation: serializeReservation(reservation, lockedBook.openLibraryId),
    };
  });

  if (outcome.error) {
    throw outcome.error;
  }

  return outcome;
}

export async function cancelReservation(userId, reservationId) {
  if (!isUuid(reservationId)) {
    throw reservationError("Invalid reservation ID", 400);
  }

  const existing = await Reservation.findByPk(reservationId);

  if (!existing) {
    throw reservationError("Reservation not found", 404);
  }

  if (existing.userId !== userId) {
    throw reservationError("You cannot cancel another user's reservation", 403);
  }

  const outcome = await sequelize.transaction(async (transaction) => {
    const book = await Book.findByPk(existing.bookId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!book) {
      throw reservationError("Book not found", 404);
    }

    await reconcileReservationsForBook(book, transaction);

    const reservation = await Reservation.findByPk(reservationId, {
      transaction,
    });

    if (!reservation || reservation.userId !== userId) {
      return { error: reservationError("Reservation not found", 404) };
    }

    if (!ACTIVE_STATUSES.includes(reservation.status)) {
      return {
        error: reservationError(
          "This reservation can no longer be cancelled",
          409,
        ),
      };
    }

    reservation.status = STATUS.CANCELLED;
    reservation.cancelledAt = new Date();
    await reservation.save({ transaction });

    await reconcileReservationsForBook(book, transaction);

    return {
      reservation: serializeReservation(reservation, book.openLibraryId),
    };
  });

  if (outcome.error) {
    throw outcome.error;
  }

  return outcome;
}

export async function getMyReservations(userId) {
  const activeReservations = await Reservation.findAll({
    where: {
      userId,
      status: { [Op.in]: ACTIVE_STATUSES },
    },
    attributes: ["bookId"],
    raw: true,
  });

  const bookIds = [
    ...new Set(activeReservations.map((reservation) => reservation.bookId)),
  ];

  await Promise.all(
    bookIds.map((bookId) =>
      sequelize.transaction(async (transaction) => {
        const book = await Book.findByPk(bookId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (book) {
          await reconcileReservationsForBook(book, transaction);
        }
      }),
    ),
  );

  const reservations = await Reservation.findAll({
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
    reservations: reservations.map((reservation) =>
      serializeReservation(reservation, reservation.Book.openLibraryId),
    ),
  };
}
