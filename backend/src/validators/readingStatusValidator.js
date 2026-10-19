import { z } from "zod";
import { READING_STATUS } from "../models/ReadingStatus.js";

export const readingStatusParamsSchema = z.strictObject({
  openLibraryId: z
    .string()
    .regex(/^OL[0-9]+W$/, "Invalid Open Library work ID"),
});

export const updateReadingStatusSchema = z.strictObject({
  status: z.enum([READING_STATUS.READING, READING_STATUS.COMPLETED]),
});

export const readingStatusQuerySchema = z.strictObject({
  status: z
    .enum([READING_STATUS.READING, READING_STATUS.COMPLETED])
    .default(READING_STATUS.READING),
});
