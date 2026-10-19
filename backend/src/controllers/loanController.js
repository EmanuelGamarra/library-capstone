import { borrowBook, returnBook, getMyLoans } from "../services/loanService.js";
import { borrowBookSchema } from "../validators/loanValidator.js";
import { validate as isUuid } from "uuid";

export async function createLoan(req, res) {
  const validation = borrowBookSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      message: "Invalid loan request",
    });
  }

  const result = await borrowBook(req.user.id, validation.data.openLibraryId);

  return res.status(201).json(result);
}

export async function returnLoan(req, res) {
  const { loanId } = req.params;

  if (!isUuid(loanId)) {
    return res.status(400).json({
      message: "Invalid loan ID",
    });
  }

  const result = await returnBook(req.user.id, loanId);

  return res.status(200).json(result);
}

export async function listMyLoans(req, res) {
  const { status } = req.query;

  if (status !== undefined && status !== "active") {
    return res.status(400).json({
      message: "Invalid loan status filter",
    });
  }

  const result = await getMyLoans(req.user.id, status);

  return res.status(200).json(result);
}
