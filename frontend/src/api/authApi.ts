import { API_URL } from "./config";
import type {
  AuthUser,
  LoginCredentials,
  LoginResponse,
  RegisterData,
  UserResponse,
} from "../types/auth";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new ApiError(
      error.message || "Something went wrong",
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function loginUser(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  return handleResponse<LoginResponse>(response);
}

export async function registerUser(data: RegisterData): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await handleResponse<UserResponse>(response);

  return result.user;
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await handleResponse<UserResponse>(response);

  return result.user;
}
