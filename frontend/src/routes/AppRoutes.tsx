import { Route, Routes } from "react-router-dom";
import HomePage from "../pages/HomePage";
import BookDetailPage from "../pages/BookDetailPage";
import LoansPage from "../pages/LoansPage";
import WishlistPage from "../pages/WishlistPage";
import CatalogPage from "../pages/CatalogPage";
import AppLayout from "../components/layout/AppLayout";
import ReservationsPage from "../pages/ReservationPage";
import SettingsPage from "../pages/SettingsPage";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/books/:bookId" element={<BookDetailPage />} />
        <Route path="/loans" element={<LoansPage />} />
        <Route path="/reservations" element={<ReservationsPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
