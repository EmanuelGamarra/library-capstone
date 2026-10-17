import { validate as isUuid } from "uuid";
import {
  createReservation,
  getMyReservations,
  cancelReservation,
} from "../services/reservationService.js";
import { createReservationSchema } from "../validators/reservationValidator.js";

export async function createReservationController(req, res) {
  const validation = createReservationSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      message: "Invalid reservation request",
    });
  }

  const result = await createReservation(
    req.user.id,
    validation.data.openLibraryId,
  );

  return res.status(201).json(result);
}

export async function listMyReservations(req, res) {
  const result = await getMyReservations(req.user.id);

  return res.status(200).json(result);
}

export async function cancelReservationController(req, res) {
  const { reservationId } = req.params;

  if (!isUuid(reservationId)) {
    return res.status(400).json({
      message: "Invalid reservation ID",
    });
  }

  const result = await cancelReservation(req.user.id, reservationId);

  return res.status(200).json(result);
}
