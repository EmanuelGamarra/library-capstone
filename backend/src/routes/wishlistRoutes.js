import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";

import {
  listMyWishlist,
  addWishlistItem,
  deleteWishlistItem,
} from "../controllers/wishlistController.js";

const router = Router();

router.use(authenticate);

router.get("/", listMyWishlist);
router.post("/", addWishlistItem);
router.delete("/:openLibraryId", deleteWishlistItem);

export default router;
