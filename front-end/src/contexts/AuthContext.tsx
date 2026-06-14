import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import type { AuthUser, AuthState, AppRole } from '../types/auth';

interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  role: AppRole;
  exp: number;
}

interface AuthContextValue extends AuthState {
  login:  (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadInitialState(): Pick<AuthState, 'user' | 'token'> {
  try {
    const token = localStorage.getItem('token');
    if (!token) return { token: null, user: null };

    const payload = jwtDecode<JwtPayload>(token);
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      return { token: null, user: null };
    }

    const user: AuthUser = {
      userId:   payload.userId,
      email:    payload.email,
      username: payload.username,
      role:     payload.role,
    };
    return { token, user };
  } catch {
    localStorage.removeItem('token');
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Pick<AuthState, 'user' | 'token'>>(loadInitialState);

  const login = useCallback((token: string) => {
    try {
      const payload = jwtDecode<JwtPayload>(token);
      const user: AuthUser = {
        userId:   payload.userId,
        email:    payload.email,
        username: payload.username,
        role:     payload.role,
      };
      localStorage.setItem('token', token);
      setState({ token, user });
    } catch {
      console.error('Invalid token received');
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setState({ token: null, user: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, isLoading: false, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}
