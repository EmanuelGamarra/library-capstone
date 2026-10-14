import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import {
  createLoan,
  returnLoan,
  listMyLoans,
} from "../controllers/loanController.js";

const router = Router();

router.use(authenticate);

router.post("/", createLoan);
router.get("/me", listMyLoans);
router.patch("/:loanId/return", returnLoan);

export default router;
