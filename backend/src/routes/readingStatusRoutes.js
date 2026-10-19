import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";

import {
  getMyReadingStatus,
  saveMyReadingStatus,
  listMyBooksByReadingStatus,
} from "../controllers/readingStatusController.js";

const router = Router();

router.use(authenticate);

router.get("/", listMyBooksByReadingStatus);
router.get("/:openLibraryId", getMyReadingStatus);
router.patch("/:openLibraryId", saveMyReadingStatus);

export default router;
