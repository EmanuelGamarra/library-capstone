import type { Book } from "../types/book";
import type { OpenLibraryBookDocument } from "../types/openLibrary";
import { isOpenLibraryWorkId } from "./openLibraryId";

const OPEN_LIBRARY_COVERS_URL = "https://covers.openlibrary.org";

const getWorkId = (key: string): string | null => {
  const workId = key.startsWith("/works/") ? key.slice("/works/".length) : key;

  return isOpenLibraryWorkId(workId) ? workId : null;
};

const getCoverUrl = (coverId?: number): string | null => {
  if (!coverId) {
    return null;
  }

  return `${OPEN_LIBRARY_COVERS_URL}/b/id/${coverId}-M.jpg`;
};

export const mapOpenLibraryBook = (document: OpenLibraryBookDocument): Book => {
  const workId = getWorkId(document.key);

  if (!workId) {
    throw new Error("Invalid Open Library Work ID");
  }

  return {
    id: workId,
    title: document.title,
    authors: document.author_name ?? [],
    coverUrl: getCoverUrl(document.cover_i),
    firstPublishYear: document.first_publish_year ?? null,
  };
};

export const mapValidOpenLibraryBooks = (
  documents: OpenLibraryBookDocument[],
): Book[] => {
  return documents
    .filter((document) => getWorkId(document.key) !== null)
    .map(mapOpenLibraryBook);
};
