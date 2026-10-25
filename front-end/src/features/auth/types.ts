/** Global role on the user. Per-project roles (owner / worker) live in features/members. */
export type AppRole = 'admin' | 'user';

export interface AuthUser {
  id: string;
  email: string;
  /** null until the invited user finishes setup. */
  username: string | null;
  role: AppRole;
}

/** What the backend puts in the JWT (web_api/services/AuthService.create_access_token). */
export interface JwtClaims {
  sub: string;
  email: string;
  username: string | null;
  role: AppRole;
  exp: number;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  username: string | null;
  app_role: AppRole;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}
