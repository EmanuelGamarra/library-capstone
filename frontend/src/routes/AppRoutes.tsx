import { Route, Routes } from "react-router-dom";
import HomePage from "../pages/HomePage";
import BookDetailPage from "../pages/BookDetailPage";
import LoansPage from "../pages/LoansPage";
import WishlistPage from "../pages/WishlistPage";
import CatalogPage from "../pages/CatalogPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/catalog" element={<CatalogPage />} />
      <Route path="/books/:bookId" element={<BookDetailPage />} />
      <Route path="/loans" element={<LoansPage />} />
      <Route path="/wishlist" element={<WishlistPage />} />
    </Routes>
  );
}

export default AppRoutes;
