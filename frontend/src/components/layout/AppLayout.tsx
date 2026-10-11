import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import styles from "./AppLayout.module.css";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const location = useLocation();

  const [prevLocationKey, setPrevLocationKey] = useState(location.key);

  if (prevLocationKey !== location.key) {
    setPrevLocationKey(location.key);
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    if (!isSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const drawer = drawerRef.current;

    const focusableElements = drawer?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    const firstFocusableElement = focusableElements?.[0];
    const lastFocusableElement =
      focusableElements?.[focusableElements.length - 1];

    firstFocusableElement?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSidebar();
        menuButtonRef.current?.focus();
        return;
      }

      if (
        event.key !== "Tab" ||
        !firstFocusableElement ||
        !lastFocusableElement
      ) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === lastFocusableElement
      ) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSidebarOpen]);

  return (
    <div className={styles.appLayout}>
      <div
        ref={drawerRef}
        id="primary-navigation-drawer"
        className={`${styles.drawer} ${isSidebarOpen ? styles.drawerOpen : ""}`}
      >
        <Sidebar onClose={closeSidebar} />
      </div>

      {isSidebarOpen && (
        <button
          className={styles.overlay}
          type="button"
          aria-label="Close navigation menu"
          onClick={() => {
            closeSidebar();
            menuButtonRef.current?.focus();
          }}
        />
      )}

      <div className={styles.mainArea}>
        <TopBar
          menuButtonRef={menuButtonRef}
          isMenuOpen={isSidebarOpen}
          onMenuClick={() => setIsSidebarOpen((current) => !current)}
        />

        <div className={styles.pageContent}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AppLayout;
