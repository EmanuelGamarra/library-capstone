import { API_URL } from "./config";
import { ApiError } from "./authApi";
import type {
  WishlistResponse,
  WishlistItemResponse,
  RemoveWishlistItemResponse,
} from "../types/wishlist";

async function handleWishlistResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new ApiError(
      error.message || "Wishlist request failed",
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export async function getMyWishlist(
  token: string,
  signal?: AbortSignal,
): Promise<WishlistResponse> {
  const response = await fetch(`${API_URL}/wishlist`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    signal,
  });

  return handleWishlistResponse<WishlistResponse>(response);
}

export async function addToWishlist(
  openLibraryId: string,
  token: string,
): Promise<WishlistItemResponse> {
  const response = await fetch(`${API_URL}/wishlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ openLibraryId }),
  });

  return handleWishlistResponse<WishlistItemResponse>(response);
}

export async function removeFromWishlist(
  openLibraryId: string,
  token: string,
): Promise<RemoveWishlistItemResponse> {
  const response = await fetch(
    `${API_URL}/wishlist/${encodeURIComponent(openLibraryId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return handleWishlistResponse<RemoveWishlistItemResponse>(response);
}
