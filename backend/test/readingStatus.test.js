import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";

const WORK_ID = "OL12345W";
const userId = randomUUID();

let sequelize;
let Book;
let Loan;
let ReadingStatus;
let STATUS;
let updateReadingStatus;
let originalTransaction;
let originalBookMethods;
let originalLoanFindOne;
let originalReadingStatusFindOrCreate;
let book;
let activeLoan;
let records;

function installIsolatedModelState() {
  book = { id: randomUUID(), openLibraryId: WORK_ID };
  activeLoan = { id: randomUUID(), userId, bookId: book.id, returnedAt: null };
  records = [];

  Book.findOne = async ({ where }) =>
    where.openLibraryId === book.openLibraryId ? book : null;
  Book.findByPk = async (id) => (id === book.id ? book : null);

  Loan.findOne = async ({ where }) => {
    if (
      activeLoan &&
      where.userId === activeLoan.userId &&
      where.bookId === activeLoan.bookId &&
      where.returnedAt === null
    ) {
      return activeLoan;
    }

    return null;
  };

  ReadingStatus.findOrCreate = async ({ where, defaults }) => {
    const existing = records.find(
      (record) =>
        record.userId === where.userId && record.bookId === where.bookId,
    );

    if (existing) return [existing, false];

    const record = {
      id: randomUUID(),
      ...where,
      ...defaults,
      updatedAt: new Date("2026-10-20T12:00:00.000Z"),
      async save() {
        return this;
      },
    };
    records.push(record);
    return [record, true];
  };

  sequelize.transaction = async (callback) =>
    callback({ LOCK: { UPDATE: "UPDATE" } });
}

before(async () => {
  [
    { default: sequelize },
    { default: Book },
    { default: Loan },
    { default: ReadingStatus, READING_STATUS: STATUS },
    { updateReadingStatus },
  ] = await Promise.all([
    import("../src/config/database.js"),
    import("../src/models/Book.js"),
    import("../src/models/Loan.js"),
    import("../src/models/ReadingStatus.js"),
    import("../src/services/readingStatusService.js"),
  ]);

  originalTransaction = sequelize.transaction;
  originalBookMethods = {
    findOne: Book.findOne,
    findByPk: Book.findByPk,
  };
  originalLoanFindOne = Loan.findOne;
  originalReadingStatusFindOrCreate = ReadingStatus.findOrCreate;
});

beforeEach(installIsolatedModelState);

after(() => {
  sequelize.transaction = originalTransaction;
  Object.assign(Book, originalBookMethods);
  Loan.findOne = originalLoanFindOne;
  ReadingStatus.findOrCreate = originalReadingStatusFindOrCreate;
});

test("sets READING status when the user has an active loan", async () => {
  const result = await updateReadingStatus(userId, WORK_ID, STATUS.READING);

  assert.equal(records.length, 1);
  assert.equal(records[0].status, STATUS.READING);
  assert.deepEqual(result, {
    readingStatus: {
      openLibraryId: WORK_ID,
      status: STATUS.READING,
      updatedAt: records[0].updatedAt,
    },
    canEdit: true,
  });
});

test("updates an existing reading status to COMPLETED", async () => {
  await updateReadingStatus(userId, WORK_ID, STATUS.READING);

  const result = await updateReadingStatus(userId, WORK_ID, STATUS.COMPLETED);

  assert.equal(records.length, 1);
  assert.equal(records[0].status, STATUS.COMPLETED);
  assert.equal(result.readingStatus.status, STATUS.COMPLETED);
  assert.equal(result.canEdit, true);
});

test("rejects a reading status update without an active loan", async () => {
  activeLoan = null;

  await assert.rejects(
    updateReadingStatus(userId, WORK_ID, STATUS.READING),
    (error) =>
      error.statusCode === 409 &&
      error.message === "An active loan is required to update reading status",
  );

  assert.equal(records.length, 0);
});
