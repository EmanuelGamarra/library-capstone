import { API_URL } from "./config";
import { ApiError } from "./authApi";
import type { BookAvailability } from "../types/loan";

export async function getBookAvailability(
  openLibraryId: string,
): Promise<BookAvailability> {
  const response = await fetch(
    `${API_URL}/books/${encodeURIComponent(openLibraryId)}/availability`,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new ApiError(
      error.message || "Failed to load book availability",
      response.status,
    );
  }

  return response.json() as Promise<BookAvailability>;
}
