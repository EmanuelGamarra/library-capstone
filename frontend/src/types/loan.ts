export interface BookAvailability {
  openLibraryId: string;
  stock: number;
  activeLoans: number;
  physicalAvailableCopies: number;
  reservedCopies: number;
  availableCopies: number;
  isAvailable: boolean;
}

export type LoanStatus = "ACTIVE" | "OVERDUE" | "RETURNED";

export interface Loan {
  id: string;
  bookId: string;
  openLibraryId?: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  status: LoanStatus;
}

export interface BorrowResponse {
  loan: Loan;
  availableCopies: number;
}

export interface ReturnResponse {
  loan: Loan;
}

export interface LoansResponse {
  loans: Loan[];
}
