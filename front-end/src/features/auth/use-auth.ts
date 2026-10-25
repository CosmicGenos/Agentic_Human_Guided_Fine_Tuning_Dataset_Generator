import { useContext } from 'react';
import { AuthContext } from './auth-context';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For screens that only render behind <RequireAuth>. */
export function useCurrentUser() {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser used while signed out');
  return user;
}
