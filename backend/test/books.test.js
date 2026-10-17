import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";

process.env.CLIENT_URL = "http://localhost:5173";
process.env.JWT_SECRET = "test-only-secret-that-is-at-least-32-bytes";

let baseUrl;
let server;
let sequelize;
let Book;
let Loan;
let Reservation;
let originalTransaction;
let originalBookFindOne;
let originalBookFindByPk;
let originalBookCreate;
let originalBookFindOrCreate;
let originalLoanCount;
let originalReservationFindAll;
let originalReservationCount;

before(async () => {
  const [
    { default: app },
    { default: sequelizeInstance },
    { default: BookModel },
    { default: LoanModel },
    { default: ReservationModel },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/config/database.js"),
    import("../src/models/Book.js"),
    import("../src/models/Loan.js"),
    import("../src/models/Reservation.js"),
  ]);

  sequelize = sequelizeInstance;
  Book = BookModel;
  Loan = LoanModel;
  Reservation = ReservationModel;
  originalTransaction = sequelize.transaction;
  originalBookFindOne = Book.findOne;
  originalBookFindByPk = Book.findByPk;
  originalBookCreate = Book.create;
  originalBookFindOrCreate = Book.findOrCreate;
  originalLoanCount = Loan.count;
  originalReservationFindAll = Reservation.findAll;
  originalReservationCount = Reservation.count;

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(() => {
  sequelize.transaction = originalTransaction;
  Book.findOne = originalBookFindOne;
  Book.findByPk = originalBookFindByPk;
  Book.create = originalBookCreate;
  Book.findOrCreate = originalBookFindOrCreate;
  Loan.count = originalLoanCount;
  Reservation.findAll = originalReservationFindAll;
  Reservation.count = originalReservationCount;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("availability route returns default stock for an unknown work", async () => {
  let writeAttempts = 0;
  Book.findOne = async () => null;
  Book.create = async () => {
    writeAttempts += 1;
  };
  Book.findOrCreate = async () => {
    writeAttempts += 1;
  };

  const response = await fetch(`${baseUrl}/api/books/OL12345W/availability`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    openLibraryId: "OL12345W",
    stock: 5,
    activeLoans: 0,
    physicalAvailableCopies: 5,
    reservedCopies: 0,
    availableCopies: 5,
    isAvailable: true,
  });
  assert.equal(writeAttempts, 0);
});

test("availability route rejects malformed Open Library work IDs", async () => {
  const response = await fetch(`${baseUrl}/api/books/not-a-work/availability`);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    message: "Invalid Open Library work ID",
  });
});

test("availability route subtracts active loans from stored stock", async () => {
  const book = {
    id: "book-id",
    openLibraryId: "OL12345W",
    stock: 5,
  };
  Book.findOne = async () => book;
  Book.findByPk = async () => book;
  Loan.count = async ({ where }) => {
    assert.deepEqual(where, {
      bookId: "book-id",
      returnedAt: null,
    });
    return 2;
  };
  Reservation.findAll = async () => [];
  Reservation.count = async () => 0;
  sequelize.transaction = async (callback) =>
    callback({ LOCK: { UPDATE: "UPDATE" } });

  const response = await fetch(`${baseUrl}/api/books/OL12345W/availability`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.physicalAvailableCopies, 3);
  assert.equal(body.reservedCopies, 0);
  assert.equal(body.availableCopies, 3);
  assert.equal(body.isAvailable, true);
});
