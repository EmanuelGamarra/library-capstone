import { Route, Routes } from "react-router-dom";
import HomePage from "../pages/HomePage";
import BookDetailPage from "../pages/BookDetailPage";
import LoansPage from "../pages/LoansPage";
import WishlistPage from "../pages/WishlistPage";
import CatalogPage from "../pages/CatalogPage";
import AppLayout from "../components/layout/AppLayout";
import SettingsPage from "../pages/SettingsPage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import ProtectedRoute from "./ProtectedRoutes";
import ReservationsPage from "../pages/ReservationsPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/books/:bookId" element={<BookDetailPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/loans" element={<LoansPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
