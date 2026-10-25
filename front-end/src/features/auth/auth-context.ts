import { createContext } from 'react';
import type { AuthUser } from './types';

export interface AuthContextValue {
  user: AuthUser | null;
  /** Store a freshly issued token. Returns false if the token can't be used. */
  login: (token: string) => boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
