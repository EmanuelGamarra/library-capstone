const OPEN_LIBRARY_URL = "https://openlibrary.org";

export const testOpenLibraryConnection = async () => {
  const response = await fetch(
    `${OPEN_LIBRARY_URL}/search.json?q=clean+code&limit=1`,
  );

  if (!response.ok) {
    throw new Error("Open Library request failed");
  }

  return response.json();
};
