import { api } from '@/lib/api';
import type { CreateProjectInput, Project, UpdateProjectInput } from './types';

export const projectsApi = {
  /** Projects you're a member of (admins: all), newest first. */
  list: () => api.get<Project[]>('/projects').then((r) => r.data),
  get: (id: string) => api.get<Project>(`/projects/${id}`).then((r) => r.data),
  create: (input: CreateProjectInput) => api.post<Project>('/projects', input).then((r) => r.data),
  update: (id: string, input: UpdateProjectInput) => api.patch<Project>(`/projects/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete(`/projects/${id}`).then(() => undefined),
};
