export type AppRole = 'owner' | 'worker' | 'admin';

export interface AuthUser {
  userId: string;
  email: string;
  username: string;
  role: AppRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
}
