import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";
import type { AuthContextValue } from "../contexts/AuthContext";
import LoginPage from "./LoginPage";

function DestinationProbe() {
  const location = useLocation();

  return <p>{`${location.pathname}${location.search}${location.hash}`}</p>;
}

test("successful login returns to the complete intended destination", async () => {
  const user = userEvent.setup();
  const login = jest.fn().mockResolvedValue(undefined);
  const auth: AuthContextValue = {
    token: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login,
    register: jest.fn(),
    logout: jest.fn(),
  };

  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/login",
            state: {
              from: {
                pathname: "/catalog",
                search: "?q=react&page=2",
                hash: "#results",
              },
              sessionExpired: true,
            },
          },
        ]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/catalog" element={<DestinationProbe />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  expect(screen.getByRole("alert")).toHaveTextContent("session has expired");

  await user.type(screen.getByLabelText("Email address"), "reader@example.com");
  await user.type(screen.getByLabelText("Password"), "password");
  await user.click(screen.getByRole("button", { name: "Sign in" }));

  expect(login).toHaveBeenCalledWith({
    email: "reader@example.com",
    password: "password",
  });
  expect(
    await screen.findByText("/catalog?q=react&page=2#results"),
  ).toBeInTheDocument();
});
