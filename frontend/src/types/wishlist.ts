export interface WishlistItem {
  id: string;
  openLibraryId: string;
  createdAt: string;
}

export interface WishlistResponse {
  items: WishlistItem[];
}

export interface WishlistItemResponse {
  item: WishlistItem;
}

export interface RemoveWishlistItemResponse {
  item: {
    openLibraryId: string;
  };
}
