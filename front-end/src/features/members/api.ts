import { api } from '@/lib/api';
import type { Member, ProjectRole } from './types';

export const membersApi = {
  list: (projectId: string) => api.get<Member[]>(`/projects/${projectId}/members`).then((r) => r.data),

  /** The user must already exist (invite them first under Users). */
  add: (projectId: string, input: { email: string; role: ProjectRole }) =>
    api.post<Member>(`/projects/${projectId}/members`, input).then((r) => r.data),

  updateRole: (projectId: string, userId: string, role: ProjectRole) =>
    api.patch<Member>(`/projects/${projectId}/members/${userId}`, { role }).then((r) => r.data),

  remove: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/members/${userId}`).then(() => undefined),
};
