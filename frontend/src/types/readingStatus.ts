export type ReadingStatus = "READING" | "COMPLETED";

export interface ReadingStatusRecord {
  openLibraryId: string;
  status: ReadingStatus;
  updatedAt: string;
}

export interface ReadingStatusResponse {
  readingStatus: ReadingStatusRecord | null;
  canEdit: boolean;
}

export interface BooksByReadingStatusResponse {
  items: ReadingStatusRecord[];
}
