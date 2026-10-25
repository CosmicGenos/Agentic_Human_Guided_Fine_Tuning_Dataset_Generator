import { jwtDecode } from 'jwt-decode';
import type { AuthUser, JwtClaims } from './types';

export interface Session {
  token: string;
  user: AuthUser;
  /** Epoch ms when the token stops working. */
  expiresAt: number;
}

/** Decode a token into a session, or null if it's malformed or already expired. */
export function parseSession(token: string | null): Session | null {
  if (!token) return null;
  try {
    const c = jwtDecode<JwtClaims>(token);
    const expiresAt = c.exp * 1000;
    if (!c.sub || expiresAt <= Date.now()) return null;
    return {
      token,
      expiresAt,
      user: { id: c.sub, email: c.email, username: c.username ?? null, role: c.role },
    };
  } catch {
    return null;
  }
}
