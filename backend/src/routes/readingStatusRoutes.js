import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";

import {
  getMyReadingStatus,
  saveMyReadingStatus,
} from "../controllers/readingStatusController.js";

const router = Router();

router.use(authenticate);

router.get("/:openLibraryId", getMyReadingStatus);
router.patch("/:openLibraryId", saveMyReadingStatus);

export default router;
