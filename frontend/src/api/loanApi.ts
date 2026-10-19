import { API_URL } from "./config";
import { ApiError } from "./authApi";

import type {
  BorrowResponse,
  LoansResponse,
  ReturnResponse,
} from "../types/loan";

async function handleLoanResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new ApiError(error.message || "Loan request failed", response.status);
  }

  return response.json() as Promise<T>;
}

export async function borrowBook(
  openLibraryId: string,
  token: string,
): Promise<BorrowResponse> {
  const response = await fetch(`${API_URL}/loans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ openLibraryId }),
  });

  return handleLoanResponse<BorrowResponse>(response);
}

export async function returnBook(
  loanId: string,
  token: string,
): Promise<ReturnResponse> {
  const response = await fetch(
    `${API_URL}/loans/${encodeURIComponent(loanId)}/return`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return handleLoanResponse<ReturnResponse>(response);
}

export async function getMyActiveLoans(token: string): Promise<LoansResponse> {
  const response = await fetch(`${API_URL}/loans/me?status=active`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleLoanResponse<LoansResponse>(response);
}

export async function getMyLoans(token: string): Promise<LoansResponse> {
  const response = await fetch(`${API_URL}/loans/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleLoanResponse<LoansResponse>(response);
}
