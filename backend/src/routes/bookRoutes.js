import { Router } from "express";
import { getAvailability } from "../controllers/bookController.js";

const router = Router();

router.get("/:openLibraryId/availability", getAvailability);

export default router;
