import { API_URL } from "./config";
import { ApiError } from "./authApi";

import type {
  ReservationResponse,
  ReservationsResponse,
} from "../types/reservation";

async function handleReservationResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new ApiError(
      error.message || "Reservation request failed",
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export async function getMyReservations(
  token: string,
): Promise<ReservationsResponse> {
  const response = await fetch(`${API_URL}/reservations/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  return handleReservationResponse<ReservationsResponse>(response);
}

export async function createReservation(
  openLibraryId: string,
  token: string,
): Promise<ReservationResponse> {
  const response = await fetch(`${API_URL}/reservations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ openLibraryId }),
  });

  return handleReservationResponse<ReservationResponse>(response);
}

export async function cancelReservation(
  reservationId: string,
  token: string,
): Promise<ReservationResponse> {
  const response = await fetch(
    `${API_URL}/reservations/${encodeURIComponent(reservationId)}/cancel`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return handleReservationResponse<ReservationResponse>(response);
}
