export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface UserResponse {
  user: AuthUser;
}
