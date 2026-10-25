import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api-error';
import type { User } from '@/features/auth/types';
import { usersApi } from './api';

export const userKeys = {
  all: ['users'] as const,
};

export function useUsers() {
  return useQuery<User[], ApiError>({ queryKey: userKeys.all, queryFn: usersApi.list });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.invite,
    onSuccess: (user) => {
      toast.success(`Invitation sent to ${user.email}`);
      return qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useResendInvite() {
  return useMutation({
    mutationFn: usersApi.resendInvite,
    onSuccess: (user) => toast.success(`New invitation sent to ${user.email}`),
  });
}

export function useSetUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) => usersApi.setActive(userId, isActive),
    onSuccess: (user) => {
      toast.success(user.is_active ? `${user.email} reactivated` : `${user.email} deactivated`);
      return qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
