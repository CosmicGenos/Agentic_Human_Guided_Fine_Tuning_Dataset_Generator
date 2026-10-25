import { api } from '@/lib/api';
import type { Extraction, ExtractionDetail } from './types';

export const extractionsApi = {
  list: (projectId: string) => api.get<Extraction[]>(`/projects/${projectId}/extractions`).then((r) => r.data),

  /** Summary plus the text itself (loaded from storage; 404 until the document is processed). */
  get: (documentId: string) => api.get<ExtractionDetail>(`/documents/${documentId}/extraction`).then((r) => r.data),
};
