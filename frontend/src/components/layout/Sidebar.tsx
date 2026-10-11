import { NavLink } from "react-router-dom";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  onClose: () => void;
}

function Sidebar({ onClose }: SidebarProps) {
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.navLink} ${isActive ? styles.active : ""}`;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            L
          </span>

          <span className={styles.brandName}>LibraryApp</span>
        </div>
        <button
          className={styles.closeButton}
          type="button"
          aria-label="Close navigation menu"
          onClick={onClose}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </svg>
        </button>
      </div>

      <nav className={styles.navigation} aria-label="Primary navigation">
        <div className={styles.navGroup}>
          <p className={styles.navGroupTitle}>Explore</p>

          <NavLink to="/" end className={getNavLinkClass}>
            Home
          </NavLink>

          <NavLink to="/catalog" className={getNavLinkClass}>
            Catalog
          </NavLink>
        </div>

        <div className={styles.navGroup}>
          <p className={styles.navGroupTitle}>My Library</p>

          <NavLink to="/loans" className={getNavLinkClass}>
            My Loans
          </NavLink>

          <NavLink to="/reservations" className={getNavLinkClass}>
            Reservations
          </NavLink>

          <NavLink to="/wishlist" className={getNavLinkClass}>
            Wishlist
          </NavLink>
        </div>

        <div className={styles.navGroup}>
          <NavLink to="/settings" className={getNavLinkClass}>
            Settings
          </NavLink>
        </div>
      </nav>
    </aside>
  );
}

export default Sidebar;
