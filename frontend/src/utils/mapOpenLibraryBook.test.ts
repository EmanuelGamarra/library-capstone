import type { OpenLibraryBookDocument } from "../types/openLibrary";
import {
  mapOpenLibraryBook,
  mapValidOpenLibraryBooks,
} from "./mapOpenLibraryBook";

const validWork: OpenLibraryBookDocument = {
  key: "/works/OL123W",
  title: "Valid work",
  author_name: ["Author"],
  cover_i: 42,
  first_publish_year: 2020,
};

test("maps prefixed and bare Work IDs while discarding editions and malformed keys", () => {
  const books = mapValidOpenLibraryBooks([
    validWork,
    { ...validWork, key: "OL789W", title: "Bare work ID" },
    { ...validWork, key: "/books/OL456M", title: "Edition" },
    { ...validWork, key: "OL456M", title: "Bare edition ID" },
    { ...validWork, key: "/works/not-a-work", title: "Malformed" },
  ]);

  expect(books).toEqual([
    {
      id: "OL123W",
      title: "Valid work",
      authors: ["Author"],
      coverUrl: "https://covers.openlibrary.org/b/id/42-M.jpg",
      firstPublishYear: 2020,
    },
    {
      id: "OL789W",
      title: "Bare work ID",
      authors: ["Author"],
      coverUrl: "https://covers.openlibrary.org/b/id/42-M.jpg",
      firstPublishYear: 2020,
    },
  ]);
});

test("the strict mapper rejects documents that are not Works", () => {
  expect(() =>
    mapOpenLibraryBook({ ...validWork, key: "/books/OL456M" }),
  ).toThrow("Invalid Open Library Work ID");
});
