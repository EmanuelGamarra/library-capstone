import { API_URL } from "./config";
import { ApiError } from "./authApi";
import type {
  ReadingStatus,
  ReadingStatusResponse,
} from "../types/readingStatus";

async function handleReadingStatusResponse(
  response: Response,
): Promise<ReadingStatusResponse> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new ApiError(
      error.message || "Reading status request failed",
      response.status,
    );
  }

  return response.json() as Promise<ReadingStatusResponse>;
}

export async function getReadingStatus(
  openLibraryId: string,
  token: string,
  signal?: AbortSignal,
): Promise<ReadingStatusResponse> {
  const response = await fetch(
    `${API_URL}/reading-status/${encodeURIComponent(openLibraryId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal,
    },
  );

  return handleReadingStatusResponse(response);
}

export async function updateReadingStatus(
  openLibraryId: string,
  status: ReadingStatus,
  token: string,
): Promise<ReadingStatusResponse> {
  const response = await fetch(
    `${API_URL}/reading-status/${encodeURIComponent(openLibraryId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
      cache: "no-store",
    },
  );

  return handleReadingStatusResponse(response);
}
