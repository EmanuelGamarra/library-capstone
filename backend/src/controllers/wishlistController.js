import {
  addWishlistItemSchema,
  wishlistParamsSchema,
} from "../validators/wishlistValidator.js";
import {
  getMyWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../services/wishlistService.js";

export async function listMyWishlist(req, res) {
  const result = await getMyWishlist(req.user.id);

  return res.status(200).json(result);
}

export async function addWishlistItem(req, res) {
  const validation = addWishlistItemSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      message: "Invalid wishlist request",
    });
  }

  const result = await addToWishlist(
    req.user.id,
    validation.data.openLibraryId,
  );

  return res.status(201).json(result);
}

export async function deleteWishlistItem(req, res) {
  const validation = wishlistParamsSchema.safeParse(req.params);

  if (!validation.success) {
    return res.status(400).json({
      message: "Invalid book ID",
    });
  }

  const result = await removeFromWishlist(
    req.user.id,
    validation.data.openLibraryId,
  );

  return res.status(200).json(result);
}
