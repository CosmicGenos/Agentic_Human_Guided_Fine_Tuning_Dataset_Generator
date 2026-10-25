import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../use-auth';

/** Signed-in users only; remembers where they were headed. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

/** Admins only. The backend enforces this too; this just keeps people off dead screens. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/app" replace />;
  return children;
}

/** Public auth pages bounce signed-in users into the app. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/app" replace />;
  return children;
}
