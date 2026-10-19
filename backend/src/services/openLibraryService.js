const OPEN_LIBRARY_URL = "https://openlibrary.org";

export async function verifyOpenLibraryWork(openLibraryId) {
  let response;

  try {
    response = await fetch(`${OPEN_LIBRARY_URL}/works/${openLibraryId}.json`, {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    const error = new Error("Open Library is unavailable");
    error.statusCode = 503;
    throw error;
  }

  if (response.status === 404) {
    const error = new Error("Book not found in Open Library");
    error.statusCode = 404;
    throw error;
  }

  if (!response.ok) {
    const error = new Error("Open Library is unavailable");
    error.statusCode = 503;
    throw error;
  }
}
