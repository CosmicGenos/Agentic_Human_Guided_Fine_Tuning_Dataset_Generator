import type { DocumentStatus } from '@/features/documents/types';

export type JobStatus = 'queued' | 'running' | 'completed' | 'partial' | 'failed';

export interface JobSummary {
  id: string;
  project_id: string;
  status: JobStatus;
  error: string | null;
  requested_by: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface JobDocument {
  document_id: string;
  original_name: string;
  status: DocumentStatus;
  error: string | null;
}

/** A job with its per-document status (only returned by GET /processing-jobs/{id}). */
export interface Job extends JobSummary {
  documents: JobDocument[];
}

export function isJobActive(status: JobStatus): boolean {
  return status === 'queued' || status === 'running';
}
