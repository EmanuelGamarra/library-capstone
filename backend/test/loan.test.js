import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, test } from "node:test";
import jwt from "jsonwebtoken";

process.env.CLIENT_URL = "http://localhost:5173";
process.env.JWT_SECRET = "test-only-secret-that-is-at-least-32-bytes";

const WORK_ID = "OL12345W";
const OTHER_WORK_ID = "OL67890W";
const userIds = Array.from({ length: 7 }, () => randomUUID());
const nativeFetch = globalThis.fetch;

let app;
let baseUrl;
let server;
let sequelize;
let Book;
let Loan;
let User;
let originalTransaction;
let originalBookMethods;
let originalLoanMethods;
let originalUserFindByPk;
let books;
let loans;
let externalRequest;

function tokenFor(userId) {
  return jwt.sign({}, process.env.JWT_SECRET, {
    algorithm: "HS256",
    subject: userId,
    expiresIn: 60,
  });
}

function authHeaders(userId) {
  return { authorization: `Bearer ${tokenFor(userId)}` };
}

function request(path, options = {}) {
  return nativeFetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
}

function borrow(openLibraryId, userId = userIds[0], headers = undefined) {
  return request("/api/loans", {
    method: "POST",
    headers: headers ?? authHeaders(userId),
    body: JSON.stringify({ openLibraryId }),
  });
}

function returnLoan(loanId, userId = userIds[0], headers = undefined) {
  return request(`/api/loans/${loanId}/return`, {
    method: "PATCH",
    headers: headers ?? authHeaders(userId),
  });
}

function addBook({ openLibraryId = WORK_ID, stock = 5 } = {}) {
  const book = { id: randomUUID(), openLibraryId, stock };
  books.push(book);
  return book;
}

function addLoan({
  userId,
  bookId,
  borrowedAt = new Date(),
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

function matchesWhere(record, where) {
  return Object.entries(where).every(([key, value]) => record[key] === value);
}

function installIsolatedModelState() {
  books = [];
  loans = [];
  externalRequest = async () => new Response(null, { status: 200 });

  User.findByPk = async (id) =>
    userIds.includes(id)
      ? {
          id,
          name: `Reader ${userIds.indexOf(id) + 1}`,
          email: `reader-${id}@example.com`,
          createdAt: new Date(),
        }
      : null;

  Book.findOne = async ({ where }) =>
    books.find((book) => matchesWhere(book, where)) ?? null;

  Book.findOrCreate = async ({ where, defaults }) => {
    const existing = books.find((book) => matchesWhere(book, where));
    if (existing) return [existing, false];
    return [addBook({ ...where, ...defaults }), true];
  };

  Book.findByPk = async (id) => books.find((book) => book.id === id) ?? null;

  Loan.findOne = async ({ where }) =>
    loans.find((loan) => matchesWhere(loan, where)) ?? null;

  Loan.count = async ({ where }) =>
    loans.filter((loan) => matchesWhere(loan, where)).length;

  Loan.create = async (values) => addLoan(values);

  Loan.findByPk = async (id) => loans.find((loan) => loan.id === id) ?? null;

  Loan.findAll = async ({ where }) =>
    loans
      .filter((loan) => matchesWhere(loan, where))
      .sort((left, right) => right.borrowedAt - left.borrowedAt)
      .map((loan) => ({
        ...loan,
        Book: books.find((book) => book.id === loan.bookId),
      }));

  sequelize.transaction = async (callback) =>
    callback({ LOCK: { UPDATE: "UPDATE" } });

  globalThis.fetch = async (input, options) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.startsWith("https://openlibrary.org/")) {
      return externalRequest(url, options);
    }
    return nativeFetch(input, options);
  };
}

before(async () => {
  [
    { default: app },
    { default: sequelize },
    { default: Book },
    { default: Loan },
    { default: User },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/config/database.js"),
    import("../src/models/Book.js"),
    import("../src/models/Loan.js"),
    import("../src/models/User.js"),
  ]);

  originalTransaction = sequelize.transaction;
  originalBookMethods = {
    findOne: Book.findOne,
    findOrCreate: Book.findOrCreate,
    findByPk: Book.findByPk,
  };
  originalLoanMethods = {
    findOne: Loan.findOne,
    count: Loan.count,
    create: Loan.create,
    findByPk: Loan.findByPk,
    findAll: Loan.findAll,
  };
  originalUserFindByPk = User.findByPk;

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(() => {
  Object.assign(Book, originalBookMethods);
  Object.assign(Loan, originalLoanMethods);
  User.findByPk = originalUserFindByPk;
  sequelize.transaction = originalTransaction;
  globalThis.fetch = nativeFetch;
});

after(async () => {
  globalThis.fetch = nativeFetch;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("first borrow registers the book and creates a 14-day loan", async () => {
  installIsolatedModelState();

  const response = await borrow(WORK_ID);
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(books.length, 1);
  assert.equal(books[0].openLibraryId, WORK_ID);
  assert.equal(books[0].stock, 5);
  assert.equal(loans.length, 1);
  assert.equal(loans[0].userId, userIds[0]);
  assert.equal(loans[0].returnedAt, null);
  assert.equal(
    loans[0].dueAt.getTime() - loans[0].borrowedAt.getTime(),
    14 * 24 * 60 * 60 * 1000,
  );
  assert.equal(body.availableCopies, 4);

  const availability = await request(`/api/books/${WORK_ID}/availability`);
  assert.equal((await availability.json()).availableCopies, 4);
});

test("a user cannot create a second active loan for the same book", async () => {
  installIsolatedModelState();

  const first = await borrow(WORK_ID);
  const duplicate = await borrow(WORK_ID);

  assert.equal(first.status, 201);
  assert.equal(duplicate.status, 409);
  assert.deepEqual(await duplicate.json(), {
    message: "You already have an active loan for this book",
  });
  assert.equal(loans.length, 1);
});

test("borrow rejects authentication, invalid works, and Open Library failures", async () => {
  installIsolatedModelState();

  const missingJwt = await request("/api/loans", {
    method: "POST",
    body: JSON.stringify({ openLibraryId: WORK_ID }),
  });
  const invalidJwt = await borrow(WORK_ID, userIds[0], {
    authorization: "Bearer invalid-token",
  });
  const malformedWork = await borrow("not-a-work-id");

  externalRequest = async () => new Response(null, { status: 404 });
  const nonexistentWork = await borrow(OTHER_WORK_ID);

  externalRequest = async () => {
    throw new TypeError("simulated network failure");
  };
  const unavailable = await borrow("OL99999W");

  assert.equal(missingJwt.status, 401);
  assert.equal(invalidJwt.status, 401);
  assert.equal(malformedWork.status, 400);
  assert.equal(nonexistentWork.status, 404);
  assert.deepEqual(await nonexistentWork.json(), {
    message: "Book not found in Open Library",
  });
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), {
    message: "Open Library is unavailable",
  });
  assert.equal(books.length, 0);
  assert.equal(loans.length, 0);
});

test("five users exhaust stock and a sixth receives a conflict", async () => {
  installIsolatedModelState();
  addBook();

  for (const userId of userIds.slice(0, 5)) {
    const response = await borrow(WORK_ID, userId);
    assert.equal(response.status, 201);
  }
  const sixth = await borrow(WORK_ID, userIds[5]);

  assert.equal(sixth.status, 409);
  assert.deepEqual(await sixth.json(), { message: "No copies available" });
  assert.equal(loans.filter((loan) => loan.returnedAt === null).length, 5);

  const availability = await request(`/api/books/${WORK_ID}/availability`);
  const body = await availability.json();
  assert.equal(body.activeLoans, 5);
  assert.equal(body.availableCopies, 0);
  assert.equal(body.isAvailable, false);
});

test("return restores availability, removes the active loan, and permits re-borrow", async () => {
  installIsolatedModelState();

  const borrowed = await borrow(WORK_ID);
  const borrowedBody = await borrowed.json();
  const returned = await returnLoan(borrowedBody.loan.id);
  const returnedBody = await returned.json();

  assert.equal(returned.status, 200);
  assert.notEqual(returnedBody.loan.returnedAt, null);

  const availability = await request(`/api/books/${WORK_ID}/availability`);
  assert.equal((await availability.json()).availableCopies, 5);

  const activeLoans = await request("/api/loans/me?status=active", {
    headers: authHeaders(userIds[0]),
  });
  assert.deepEqual(await activeLoans.json(), { loans: [] });

  const borrowedAgain = await borrow(WORK_ID);
  assert.equal(borrowedAgain.status, 201);
  assert.equal(loans.length, 2);
  assert.equal(loans.filter((loan) => loan.returnedAt === null).length, 1);
});

test("invalid return operations preserve loan state", async () => {
  installIsolatedModelState();

  const borrowed = await borrow(WORK_ID);
  const { loan } = await borrowed.json();
  const storedLoan = loans[0];

  const otherUser = await returnLoan(loan.id, userIds[1]);
  assert.equal(otherUser.status, 403);
  assert.equal(storedLoan.returnedAt, null);

  const invalidId = await returnLoan("not-a-uuid");
  assert.equal(invalidId.status, 400);
  assert.equal(storedLoan.returnedAt, null);

  const missingLoan = await returnLoan(randomUUID());
  assert.equal(missingLoan.status, 404);
  assert.equal(storedLoan.returnedAt, null);

  const unauthenticated = await request(`/api/loans/${loan.id}/return`, {
    method: "PATCH",
  });
  assert.equal(unauthenticated.status, 401);
  assert.equal(storedLoan.returnedAt, null);

  const successful = await returnLoan(loan.id);
  assert.equal(successful.status, 200);
  const returnedAt = storedLoan.returnedAt;
  assert.ok(returnedAt instanceof Date);

  const alreadyReturned = await returnLoan(loan.id);
  assert.equal(alreadyReturned.status, 409);
  assert.equal(storedLoan.returnedAt, returnedAt);
  assert.equal(loans.length, 1);
});
