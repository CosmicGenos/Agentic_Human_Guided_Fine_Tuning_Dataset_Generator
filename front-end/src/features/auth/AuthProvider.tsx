import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { onUnauthorized, tokenStorage } from '@/lib/token-storage';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';
import { parseSession } from './session';
import type { Session } from './session';

// setTimeout overflows (fires immediately) past ~24.8 days.
const MAX_TIMEOUT = 2_147_483_647;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(() => {
    const s = parseSession(tokenStorage.get());
    if (!s) tokenStorage.clear();
    return s;
  });

  const logout = useCallback(() => {
    tokenStorage.clear();
    setSession(null);
    queryClient.clear();
  }, [queryClient]);

  const login = useCallback((token: string) => {
    const next = parseSession(token);
    if (!next) return false;
    tokenStorage.set(token);
    setSession(next);
    return true;
  }, []);

  // Tokens last 20 minutes and there is no refresh: sign out when it runs out.
  useEffect(() => {
    if (!session) return;
    const id = window.setTimeout(
      () => {
        toast.info('Your session expired. Please sign in again.');
        logout();
      },
      Math.min(Math.max(session.expiresAt - Date.now(), 0), MAX_TIMEOUT),
    );
    return () => window.clearTimeout(id);
  }, [session, logout]);

  // A 401 from any request (token rejected, account deactivated) ends the session.
  useEffect(() => {
    onUnauthorized(() => {
      toast.info('You were signed out. Please sign in again.');
      logout();
    });
    return () => onUnauthorized(null);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({ user: session?.user ?? null, login, logout }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
