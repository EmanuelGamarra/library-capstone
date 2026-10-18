import { z } from "zod";

export const addWishlistItemSchema = z.strictObject({
  openLibraryId: z
    .string()
    .regex(/^OL[0-9]+W$/, "Invalid Open Library work ID"),
});

export const wishlistParamsSchema = z.strictObject({
  openLibraryId: z
    .string()
    .regex(/^OL[0-9]+W$/, "Invalid Open Library work ID"),
});
