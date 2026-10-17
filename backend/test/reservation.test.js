import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";
import { Op } from "sequelize";

const WORK_ID = "OL12345W";
const users = Array.from({ length: 6 }, () => randomUUID());

let sequelize;
let Book;
let Loan;
let Reservation;
let STATUS;
let createReservation;
let cancelReservation;
let borrowBook;
let returnBook;

let originalTransaction;
let originalBookMethods;
let originalLoanMethods;
let originalReservationMethods;

let books;
let loans;
let reservations;

function matchesValue(actual, expected) {
  if (expected && typeof expected === "object" && !(expected instanceof Date)) {
    if (Op.in in expected) return expected[Op.in].includes(actual);
    if (Op.lte in expected) return actual <= expected[Op.lte];
  }

  return actual === expected;
}

function matchesWhere(record, where) {
  return Object.entries(where).every(([key, value]) =>
    matchesValue(record[key], value),
  );
}

function addBook({ stock = 1 } = {}) {
  const book = { id: randomUUID(), openLibraryId: WORK_ID, stock };
  books.push(book);
  return book;
}

function addLoan({
  userId,
  bookId,
  borrowedAt = new Date("2026-10-01T00:00:00.000Z"),
  dueAt = new Date(borrowedAt.getTime() + 14 * 24 * 60 * 60 * 1000),
  returnedAt = null,
}) {
  const loan = {
    id: randomUUID(),
    userId,
    bookId,
    borrowedAt,
    dueAt,
    returnedAt,
    async save() {
      return this;
    },
  };
  loans.push(loan);
  return loan;
}

function addReservation({
  id = randomUUID(),
  userId,
  bookId,
  status,
  createdAt,
  readyAt = null,
  expiresAt = null,
}) {
  const reservation = {
    id,
    userId,
    bookId,
    status,
    createdAt,
    readyAt,
    expiresAt,
    fulfilledAt: null,
    cancelledAt: null,
    async save() {
      return this;
    },
  };
  reservations.push(reservation);
  return reservation;
}

function snapshot(records) {
  return records.map((record) => ({ record, values: { ...record } }));
}

function restore(records, savedRecords) {
  records.splice(
    0,
    records.length,
    ...savedRecords.map(({ record }) => record),
  );
  for (const { record, values } of savedRecords) Object.assign(record, values);
}

function installIsolatedModelState() {
  books = [];
  loans = [];
  reservations = [];

  Book.findOne = async ({ where }) =>
    books.find((book) => matchesWhere(book, where)) ?? null;
  Book.findByPk = async (id) => books.find((book) => book.id === id) ?? null;

  Loan.findOne = async ({ where }) =>
    loans.find((loan) => matchesWhere(loan, where)) ?? null;
  Loan.findByPk = async (id) => loans.find((loan) => loan.id === id) ?? null;
  Loan.count = async ({ where }) =>
    loans.filter((loan) => matchesWhere(loan, where)).length;
  Loan.create = async (values) => addLoan(values);

  Reservation.findOne = async ({ where }) =>
    reservations.find((reservation) => matchesWhere(reservation, where)) ??
    null;
  Reservation.findByPk = async (id) =>
    reservations.find((reservation) => reservation.id === id) ?? null;
  Reservation.count = async ({ where }) =>
    reservations.filter((reservation) => matchesWhere(reservation, where))
      .length;
  Reservation.findAll = async ({ where, order, limit }) => {
    const result = reservations.filter((reservation) =>
      matchesWhere(reservation, where),
    );

    if (order) {
      result.sort((left, right) => {
        const createdDifference = left.createdAt - right.createdAt;
        return createdDifference || left.id.localeCompare(right.id);
      });
    }

    return limit === undefined ? result : result.slice(0, limit);
  };
  Reservation.create = async (values) =>
    addReservation({ ...values, createdAt: new Date() });

  sequelize.transaction = async (callback) => {
    const bookSnapshot = snapshot(books);
    const loanSnapshot = snapshot(loans);
    const reservationSnapshot = snapshot(reservations);

    try {
      return await callback({ LOCK: { UPDATE: "UPDATE" } });
    } catch (error) {
      restore(books, bookSnapshot);
      restore(loans, loanSnapshot);
      restore(reservations, reservationSnapshot);
      throw error;
    }
  };
}

before(async () => {
  [
    { default: sequelize },
    { default: Book },
    { default: Loan },
    { default: Reservation, RESERVATION_STATUS: STATUS },
    { createReservation, cancelReservation },
    { borrowBook, returnBook },
  ] = await Promise.all([
    import("../src/config/database.js"),
    import("../src/models/Book.js"),
    import("../src/models/Loan.js"),
    import("../src/models/Reservation.js"),
    import("../src/services/reservationService.js"),
    import("../src/services/loanService.js"),
  ]);

  originalTransaction = sequelize.transaction;
  originalBookMethods = {
    findOne: Book.findOne,
    findByPk: Book.findByPk,
  };
  originalLoanMethods = {
    findOne: Loan.findOne,
    findByPk: Loan.findByPk,
    count: Loan.count,
    create: Loan.create,
  };
  originalReservationMethods = {
    findOne: Reservation.findOne,
    findByPk: Reservation.findByPk,
    findAll: Reservation.findAll,
    count: Reservation.count,
    create: Reservation.create,
  };
});

beforeEach(installIsolatedModelState);

after(() => {
  sequelize.transaction = originalTransaction;
  Object.assign(Book, originalBookMethods);
  Object.assign(Loan, originalLoanMethods);
  Object.assign(Reservation, originalReservationMethods);
});

test("reservation creation rejects active loans and duplicate active reservations", async () => {
  const book = addBook();
  addLoan({ userId: users[0], bookId: book.id });

  await assert.rejects(
    createReservation(users[0], WORK_ID),
    (error) =>
      error.statusCode === 409 &&
      error.message === "You already have an active loan for this book",
  );

  const historical = addReservation({
    userId: users[1],
    bookId: book.id,
    status: STATUS.CANCELLED,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
  });
  const created = await createReservation(users[1], WORK_ID);

  assert.equal(created.reservation.status, STATUS.PENDING);
  assert.equal(historical.status, STATUS.CANCELLED);

  await assert.rejects(
    createReservation(users[1], WORK_ID),
    (error) =>
      error.statusCode === 409 &&
      error.message === "You already have an active reservation for this book",
  );
});

test("returns promote pending reservations in FIFO order without overallocating stock", async () => {
  const book = addBook({ stock: 2 });
  const firstLoan = addLoan({ userId: users[0], bookId: book.id });
  const secondLoan = addLoan({ userId: users[1], bookId: book.id });
  const second = addReservation({
    id: "00000000-0000-4000-8000-000000000002",
    userId: users[3],
    bookId: book.id,
    status: STATUS.PENDING,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
  });
  const first = addReservation({
    id: "00000000-0000-4000-8000-000000000001",
    userId: users[2],
    bookId: book.id,
    status: STATUS.PENDING,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
  });
  const third = addReservation({
    userId: users[4],
    bookId: book.id,
    status: STATUS.PENDING,
    createdAt: new Date("2026-10-03T00:00:00.000Z"),
  });

  await returnBook(firstLoan.userId, firstLoan.id);
  assert.equal(first.status, STATUS.READY);
  assert.equal(second.status, STATUS.PENDING);
  assert.equal(third.status, STATUS.PENDING);
  assert.equal(first.expiresAt - first.readyAt, 48 * 60 * 60 * 1000);

  await returnBook(secondLoan.userId, secondLoan.id);
  assert.equal(second.status, STATUS.READY);
  assert.equal(third.status, STATUS.PENDING);
  assert.equal(
    reservations.filter((item) => item.status === STATUS.READY).length,
    book.stock,
  );
});

test("a borrower cannot consume a copy allocated to another user's READY reservation", async () => {
  const book = addBook();
  const ready = addReservation({
    userId: users[0],
    bookId: book.id,
    status: STATUS.READY,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    readyAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  });

  await assert.rejects(
    borrowBook(users[1], WORK_ID),
    (error) => error.statusCode === 409,
  );

  assert.equal(ready.status, STATUS.READY);
  assert.equal(loans.length, 0);
});

test("borrowing READY creates a loan and fulfills the reservation atomically", async () => {
  const book = addBook();
  const ready = addReservation({
    userId: users[0],
    bookId: book.id,
    status: STATUS.READY,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    readyAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  });

  Loan.create = async () => {
    throw new Error("Simulated loan insert failure");
  };

  await assert.rejects(borrowBook(users[0], WORK_ID));
  assert.equal(loans.length, 0);
  assert.equal(ready.status, STATUS.READY);

  Loan.create = async (values) => addLoan(values);
  const result = await borrowBook(users[0], WORK_ID);

  assert.equal(result.loan.status, "ACTIVE");
  assert.equal(loans.length, 1);
  assert.equal(loans[0].userId, users[0]);
  assert.equal(ready.status, STATUS.FULFILLED);
  assert.equal(ready.fulfilledAt.getTime(), loans[0].borrowedAt.getTime());
});

test("expired READY persists and promotes the next reservation even when Borrow is rejected", async () => {
  const book = addBook({ stock: 2 });
  const firstExpired = addReservation({
    userId: users[0],
    bookId: book.id,
    status: STATUS.READY,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    readyAt: new Date("2026-10-01T00:00:00.000Z"),
    expiresAt: new Date("2026-10-03T00:00:00.000Z"),
  });
  const secondExpired = addReservation({
    userId: users[1],
    bookId: book.id,
    status: STATUS.READY,
    createdAt: new Date("2026-10-01T12:00:00.000Z"),
    readyAt: new Date("2026-10-01T12:00:00.000Z"),
    expiresAt: new Date("2026-10-03T12:00:00.000Z"),
  });
  const firstNext = addReservation({
    userId: users[2],
    bookId: book.id,
    status: STATUS.PENDING,
    createdAt: new Date("2026-10-02T00:00:00.000Z"),
  });
  const secondNext = addReservation({
    userId: users[3],
    bookId: book.id,
    status: STATUS.PENDING,
    createdAt: new Date("2026-10-02T12:00:00.000Z"),
  });

  await assert.rejects(
    borrowBook(users[0], WORK_ID),
    (error) => error.statusCode === 409,
  );

  assert.equal(firstExpired.status, STATUS.EXPIRED);
  assert.equal(secondExpired.status, STATUS.EXPIRED);
  assert.equal(firstNext.status, STATUS.READY);
  assert.equal(secondNext.status, STATUS.READY);
  assert.equal(loans.length, 0);
});

test("a rejected reservation request still persists lazy expiration reconciliation", async () => {
  const book = addBook();
  const expired = addReservation({
    userId: users[0],
    bookId: book.id,
    status: STATUS.READY,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    readyAt: new Date("2026-10-01T00:00:00.000Z"),
    expiresAt: new Date("2026-10-03T00:00:00.000Z"),
  });
  const next = addReservation({
    userId: users[1],
    bookId: book.id,
    status: STATUS.PENDING,
    createdAt: new Date("2026-10-02T00:00:00.000Z"),
  });

  await assert.rejects(
    createReservation(users[2], WORK_ID),
    (error) => error.statusCode === 409,
  );

  assert.equal(expired.status, STATUS.EXPIRED);
  assert.equal(next.status, STATUS.READY);
});

test("cancelling READY transfers priority while cancelling PENDING preserves it", async () => {
  const book = addBook();
  const ready = addReservation({
    userId: users[0],
    bookId: book.id,
    status: STATUS.READY,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    readyAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  });
  const next = addReservation({
    userId: users[1],
    bookId: book.id,
    status: STATUS.PENDING,
    createdAt: new Date("2026-10-02T00:00:00.000Z"),
  });
  const later = addReservation({
    userId: users[2],
    bookId: book.id,
    status: STATUS.PENDING,
    createdAt: new Date("2026-10-03T00:00:00.000Z"),
  });

  await assert.rejects(
    cancelReservation(users[5], ready.id),
    (error) => error.statusCode === 403,
  );
  assert.equal(ready.status, STATUS.READY);

  await cancelReservation(later.userId, later.id);
  assert.equal(ready.status, STATUS.READY);
  assert.equal(later.status, STATUS.CANCELLED);

  await cancelReservation(ready.userId, ready.id);
  assert.equal(ready.status, STATUS.CANCELLED);
  assert.equal(next.status, STATUS.READY);
});
