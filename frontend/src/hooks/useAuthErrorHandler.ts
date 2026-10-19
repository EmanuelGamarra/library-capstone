import { useCallback, useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/authApi";
import { useAuth } from "./useAuth";

export function useAuthErrorHandler() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();
  const locationRef = useRef({ pathname, search, hash });

  useLayoutEffect(() => {
    locationRef.current = { pathname, search, hash };
  }, [pathname, search, hash]);

  return useCallback(
    (error: unknown): boolean => {
      if (!(error instanceof ApiError) || error.status !== 401) {
        return false;
      }

      flushSync(() => {
        logout();
      });

      navigate("/login", {
        replace: true,
        state: {
          from: locationRef.current,
          sessionExpired: true,
        },
      });
      return true;
    },
    [logout, navigate],
  );
}
