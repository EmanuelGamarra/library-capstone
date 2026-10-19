import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import {
  createReservationController,
  listMyReservations,
  cancelReservationController,
} from "../controllers/reservationController.js";

const router = Router();

router.use(authenticate);

router.post("/", createReservationController);
router.get("/me", listMyReservations);
router.patch("/:reservationId/cancel", cancelReservationController);

export default router;
