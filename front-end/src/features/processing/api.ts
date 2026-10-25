import { api } from '@/lib/api';
import type { Job, JobSummary } from './types';

export const processingApi = {
  /** No ids = every document that is uploaded or failed. Only PDFs can be processed. */
  start: (projectId: string, documentIds?: string[]) =>
    api
      .post<Job>(`/projects/${projectId}/processing-jobs`, documentIds?.length ? { document_ids: documentIds } : {})
      .then((r) => r.data),

  /** Newest first, without the per-document list. */
  list: (projectId: string) =>
    api.get<JobSummary[]>(`/projects/${projectId}/processing-jobs`).then((r) => r.data),

  get: (jobId: string) => api.get<Job>(`/processing-jobs/${jobId}`).then((r) => r.data),
};
