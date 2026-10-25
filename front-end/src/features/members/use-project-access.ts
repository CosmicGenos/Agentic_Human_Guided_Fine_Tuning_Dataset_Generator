import { useAuth } from '@/features/auth/use-auth';
import { useMembers } from './queries';
import type { ProjectRole } from './types';

export interface ProjectAccess {
  /** Your role in this project; null for admins who aren't members. */
  role: ProjectRole | null;
  /** Owner of the project, or an admin (admins can do everything everywhere). */
  isOwner: boolean;
  isLoading: boolean;
}

/**
 * Whether the current user may manage a project. `GET /projects` doesn't return your role,
 * so it's derived from the member list. The backend still enforces every rule; this only
 * decides which controls to show.
 */
export function useProjectAccess(projectId: string): ProjectAccess {
  const { user } = useAuth();
  const members = useMembers(projectId);

  const role = members.data?.find((m) => m.user_id === user?.id)?.role ?? null;
  return {
    role,
    isOwner: user?.role === 'admin' || role === 'owner',
    isLoading: members.isPending,
  };
}
