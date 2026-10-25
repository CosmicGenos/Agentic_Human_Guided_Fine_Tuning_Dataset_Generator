import { api } from '@/lib/api';
import type { AppRole, User } from '@/features/auth/types';

export const usersApi = {
  list: () => api.get<User[]>('/users').then((r) => r.data),

  /** Creates the account and emails a one-time setup link (logged by the API if email isn't configured). */
  invite: (input: { email: string; app_role: AppRole }) => api.post<User>('/users', input).then((r) => r.data),

  /** Sends a new link; the old one stops working. Only valid before the user finishes setup. */
  resendInvite: (email: string) => api.post<User>('/users/resend-invite', { email }).then((r) => r.data),

  setActive: (userId: string, isActive: boolean) =>
    api.patch<User>(`/users/${userId}/active`, { is_active: isActive }).then((r) => r.data),
};
