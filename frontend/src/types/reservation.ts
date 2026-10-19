export type ReservationStatus =
  | "PENDING"
  | "READY"
  | "FULFILLED"
  | "CANCELLED"
  | "EXPIRED";

export interface Reservation {
  id: string;
  bookId: string;
  openLibraryId: string;
  status: ReservationStatus;
  createdAt: string;
  readyAt: string | null;
  expiresAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
}

export interface ReservationsResponse {
  reservations: Reservation[];
}

export interface ReservationResponse {
  reservation: Reservation;
}
