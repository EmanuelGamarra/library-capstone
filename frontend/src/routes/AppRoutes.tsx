import { Route, Routes } from "react-router-dom";
import HomePage from "../pages/HomePage";
import BookDetailPage from "../pages/BookDeatilPage";
import LoansPage from "../pages/LoansPage";
import SearchPage from "../pages/SearchPage";
import WishlistPage from "../pages/WishlistPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/books/:bookId" element={<BookDetailPage />} />
      <Route path="/loans" element={<LoansPage />} />
      <Route path="/wishlist" element={<WishlistPage />} />
    </Routes>
  );
}

export default AppRoutes;
