import { api } from '@/lib/api';
import type { ProjectDocument } from './types';

export const documentsApi = {
  /** Oldest first. */
  list: (projectId: string) =>
    api.get<ProjectDocument[]>(`/projects/${projectId}/documents`).then((r) => r.data),

  /** All-or-nothing: if one file is rejected, none are saved. */
  upload: (projectId: string, files: File[], onProgress?: (percent: number) => void) => {
    const form = new FormData();
    for (const file of files) form.append('files', file);
    return api
      .post<ProjectDocument[]>(`/projects/${projectId}/documents`, form, {
        // lets the browser add the multipart boundary (the instance default is JSON)
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0,
        onUploadProgress: (e) => {
          if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
        },
      })
      .then((r) => r.data);
  },

  remove: (documentId: string) => api.delete(`/documents/${documentId}`).then(() => undefined),
};
