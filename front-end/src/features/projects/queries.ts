import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api-error';
import { projectsApi } from './api';
import type { Project, UpdateProjectInput } from './types';

export const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
};

export function useProjects() {
  return useQuery<Project[], ApiError>({ queryKey: projectKeys.list(), queryFn: projectsApi.list });
}

export function useProject(id: string) {
  return useQuery<Project, ApiError>({ queryKey: projectKeys.detail(id), queryFn: () => projectsApi.get(id) });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (project) => {
      qc.setQueryData(projectKeys.detail(project.id), project);
      return qc.invalidateQueries({ queryKey: projectKeys.list() });
    },
  });
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProjectInput) => projectsApi.update(id, input),
    onSuccess: (project) => {
      qc.setQueryData(projectKeys.detail(id), project);
      toast.success('Project saved');
      return qc.invalidateQueries({ queryKey: projectKeys.list() });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.remove,
    onSuccess: (_void, id) => {
      qc.removeQueries({ queryKey: projectKeys.detail(id) });
      toast.success('Project deleted');
      return qc.invalidateQueries({ queryKey: projectKeys.list() });
    },
  });
}
