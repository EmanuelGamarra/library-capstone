import type { Book } from "../types/book";
import type { OpenLibraryBookDocument } from "../types/openLibrary";

const OPEN_LIBRARY_COVERS_URL = "https://covers.openlibrary.org";

const getWorkId = (key: string): string => {
  return key.replace("/works/", "");
};

const getCoverUrl = (coverId?: number): string | null => {
  if (!coverId) {
    return null;
  }

  return `${OPEN_LIBRARY_COVERS_URL}/b/id/${coverId}-M.jpg`;
};

export const mapOpenLibraryBook = (document: OpenLibraryBookDocument): Book => {
  return {
    id: getWorkId(document.key),
    title: document.title,
    authors: document.author_name ?? [],
    coverUrl: getCoverUrl(document.cover_i),
    firstPublishYear: document.first_publish_year ?? null,
  };
};
