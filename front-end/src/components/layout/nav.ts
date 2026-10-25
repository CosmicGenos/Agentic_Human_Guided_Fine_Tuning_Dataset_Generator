import type { LucideIcon } from 'lucide-react';
import { FolderKanban, KeyRound, Users } from 'lucide-react';
import type { AppRole } from '@/features/auth/types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Only show for these global roles; omit = everyone */
  roles?: AppRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Projects',    to: '/app/projects',    icon: FolderKanban },
  { label: 'Credentials', to: '/app/credentials', icon: KeyRound, roles: ['admin'] },
  { label: 'Users',       to: '/app/users',       icon: Users,    roles: ['admin'] },
];

/** Header title for a pathname: the nav item that owns it. */
export function titleFor(pathname: string): string {
  const match = NAV_ITEMS.find((n) => pathname === n.to || pathname.startsWith(`${n.to}/`));
  return match?.label ?? 'Luman';
}
