import { z } from "zod";

export const borrowBookSchema = z.strictObject({
  openLibraryId: z
    .string()
    .regex(/^OL[0-9]+W$/, "Invalid Open Library work ID"),
});
