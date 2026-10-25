import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api-error';
import { documentsApi } from './api';
import { isActive } from './types';
import type { ProjectDocument } from './types';

export const documentKeys = {
  list: (projectId: string) => ['projects', projectId, 'documents'] as const,
};

/** Re-fetches every few seconds while any document is queued or processing. */
export function useDocuments(projectId: string) {
  return useQuery<ProjectDocument[], ApiError>({
    queryKey: documentKeys.list(projectId),
    queryFn: () => documentsApi.list(projectId),
    refetchInterval: (query) => (query.state.data?.some((d) => isActive(d.status)) ? 4000 : false),
  });
}

export function useUploadDocuments(projectId: string) {
  const qc = useQueryClient();
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: (files: File[]) => {
      setProgress(0);
      return documentsApi.upload(projectId, files, setProgress);
    },
    onSuccess: (docs) => {
      toast.success(docs.length === 1 ? 'Uploaded 1 document' : `Uploaded ${docs.length} documents`);
      return qc.invalidateQueries({ queryKey: documentKeys.list(projectId) });
    },
  });

  return { ...mutation, progress };
}

export function useDeleteDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: documentsApi.remove,
    onSuccess: () => {
      toast.success('Document deleted');
      return qc.invalidateQueries({ queryKey: documentKeys.list(projectId) });
    },
  });
}
