import { z } from "zod";

export const createReservationSchema = z
  .object({
    openLibraryId: z.string().regex(/^OL[0-9]+W$/),
  })
  .strict();
