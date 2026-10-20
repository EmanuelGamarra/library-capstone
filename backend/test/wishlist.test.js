import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";

const WORK_ID = "OL12345W";
const users = [randomUUID(), randomUUID()];
const nativeFetch = globalThis.fetch;

let Book;
let WishlistItem;
let addToWishlist;
let getMyWishlist;
let removeFromWishlist;
let originalBookMethods;
let originalWishlistMethods;
let books;
let items;

function installIsolatedModelState() {
  books = [];
  items = [];

  Book.findOne = async ({ where }) =>
    books.find((book) => book.openLibraryId === where.openLibraryId) ?? null;

  Book.findOrCreate = async ({ where, defaults }) => {
    const existing = books.find(
      (book) => book.openLibraryId === where.openLibraryId,
    );

    if (existing) return [existing, false];

    const book = { id: randomUUID(), ...where, ...defaults };
    books.push(book);
    return [book, true];
  };

  WishlistItem.findOrCreate = async ({ where, defaults }) => {
    const existing = items.find(
      (item) => item.userId === where.userId && item.bookId === where.bookId,
    );

    if (existing) return [existing, false];

    const item = {
      id: randomUUID(),
      ...defaults,
      createdAt: new Date("2026-10-20T12:00:00.000Z"),
    };
    items.push(item);
    return [item, true];
  };

  WishlistItem.findAll = async ({ where }) =>
    items
      .filter((item) => item.userId === where.userId)
      .map((item) => ({
        ...item,
        Book: books.find((book) => book.id === item.bookId),
      }));

  WishlistItem.destroy = async ({ where }) => {
    const index = items.findIndex(
      (item) => item.userId === where.userId && item.bookId === where.bookId,
    );

    if (index === -1) return 0;

    items.splice(index, 1);
    return 1;
  };

  globalThis.fetch = async () => new Response(null, { status: 200 });
}

before(async () => {
  [
    { default: Book },
    { default: WishlistItem },
    { addToWishlist, getMyWishlist, removeFromWishlist },
  ] = await Promise.all([
    import("../src/models/Book.js"),
    import("../src/models/WishlistItem.js"),
    import("../src/services/wishlistService.js"),
  ]);

  originalBookMethods = {
    findOne: Book.findOne,
    findOrCreate: Book.findOrCreate,
  };
  originalWishlistMethods = {
    findAll: WishlistItem.findAll,
    findOrCreate: WishlistItem.findOrCreate,
    destroy: WishlistItem.destroy,
  };
});

beforeEach(installIsolatedModelState);

after(() => {
  Object.assign(Book, originalBookMethods);
  Object.assign(WishlistItem, originalWishlistMethods);
  globalThis.fetch = nativeFetch;
});

test("adds a verified Open Library work to the user's wishlist", async () => {
  const result = await addToWishlist(users[0], WORK_ID);

  assert.equal(books.length, 1);
  assert.equal(items.length, 1);
  assert.equal(items[0].userId, users[0]);
  assert.equal(result.item.openLibraryId, WORK_ID);
});

test("lists only the authenticated user's wishlist", async () => {
  await addToWishlist(users[0], WORK_ID);
  await addToWishlist(users[1], WORK_ID);

  const result = await getMyWishlist(users[0]);

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, items[0].id);
  assert.equal(result.items[0].openLibraryId, WORK_ID);
});

test("removes a book from the authenticated user's wishlist", async () => {
  await addToWishlist(users[0], WORK_ID);

  const result = await removeFromWishlist(users[0], WORK_ID);

  assert.deepEqual(result, { item: { openLibraryId: WORK_ID } });
  assert.equal(items.length, 0);
});

test("rejects duplicates and prevents another user from removing an item", async () => {
  await addToWishlist(users[0], WORK_ID);

  await assert.rejects(
    addToWishlist(users[0], WORK_ID),
    (error) =>
      error.statusCode === 409 &&
      error.message === "Book is already in your wishlist",
  );
  await assert.rejects(
    removeFromWishlist(users[1], WORK_ID),
    (error) =>
      error.statusCode === 404 &&
      error.message === "Book not found in your wishlist",
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].userId, users[0]);
});
