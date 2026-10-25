import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api-error';
import { membersApi } from './api';
import type { Member, ProjectRole } from './types';

export const memberKeys = {
  list: (projectId: string) => ['projects', projectId, 'members'] as const,
};

export function useMembers(projectId: string) {
  return useQuery<Member[], ApiError>({
    queryKey: memberKeys.list(projectId),
    queryFn: () => membersApi.list(projectId),
  });
}

export function useAddMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; role: ProjectRole }) => membersApi.add(projectId, input),
    onSuccess: (member) => {
      toast.success(`${member.email} added`);
      return qc.invalidateQueries({ queryKey: memberKeys.list(projectId) });
    },
  });
}

export function useUpdateMemberRole(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ProjectRole }) => membersApi.updateRole(projectId, userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.list(projectId) }),
  });
}

export function useRemoveMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => membersApi.remove(projectId, userId),
    onSuccess: () => {
      toast.success('Member removed');
      return qc.invalidateQueries({ queryKey: memberKeys.list(projectId) });
    },
  });
}
