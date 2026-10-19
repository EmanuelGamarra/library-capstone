import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLayoutEffect } from "react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { ApiError } from "../api/authApi";
import { AuthContext } from "../contexts/AuthContext";
import type { AuthContextValue } from "../contexts/AuthContext";
import { useAuthErrorHandler } from "./useAuthErrorHandler";

jest.mock("../api/authApi", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

function HandlerProbe({
  recordHandler,
}: {
  recordHandler: (handler: (error: unknown) => boolean) => void;
}) {
  const handleAuthError = useAuthErrorHandler();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    recordHandler(handleAuthError);
  }, [handleAuthError, recordHandler]);

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/catalog?q=latest&page=2")}
      >
        Change location
      </button>
      <button
        type="button"
        onClick={() => handleAuthError(new ApiError("Expired", 401))}
      >
        Expire session
      </button>
    </div>
  );
}

function LoginProbe() {
  const location = useLocation();
  const from = location.state?.from;

  return (
    <p>{`${from?.pathname}${from?.search}${from?.hash ?? ""}`}</p>
  );
}

test("keeps a stable callback while redirecting from the latest location", async () => {
  const user = userEvent.setup();
  const handlers: Array<(error: unknown) => boolean> = [];
  const logout = jest.fn();
  const auth: AuthContextValue = {
    token: "token-1",
    user: {
      id: "user-1",
      name: "Reader",
      email: "reader@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout,
  };

  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={["/catalog"]}>
        <Routes>
          <Route
            path="/catalog"
            element={<HandlerProbe recordHandler={(handler) => handlers.push(handler)} />}
          />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  const initialHandler = handlers.at(-1);
  await user.click(screen.getByRole("button", { name: "Change location" }));

  expect(handlers.at(-1)).toBe(initialHandler);

  await user.click(screen.getByRole("button", { name: "Expire session" }));

  expect(await screen.findByText("/catalog?q=latest&page=2")).toBeInTheDocument();
  expect(logout).toHaveBeenCalledTimes(1);
});
