export type DocumentStatus = 'uploaded' | 'queued' | 'processing' | 'completed' | 'failed';
export type FileType = 'pdf' | 'images';

/** Named ProjectDocument to avoid clashing with the DOM's global `Document`. */
export interface ProjectDocument {
  id: string;
  project_id: string;
  original_name: string;
  file_type: FileType;
  content_type: string;
  size_bytes: number;
  status: DocumentStatus;
  /** Filled when processing failed. */
  error: string | null;
  uploaded_by: string | null;
  created_at: string;
  processed_at: string | null;
}

/** Extensions the API accepts (it also checks the real content, not just the name). */
export const ACCEPTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.bmp'] as const;

/** Only PDFs can be processed right now; images upload but aren't processed yet. */
export function isProcessable(doc: ProjectDocument): boolean {
  return doc.file_type === 'pdf';
}

/** Documents a bare "process" request would pick up (uploaded or failed PDFs). */
export function isPending(doc: ProjectDocument): boolean {
  return isProcessable(doc) && (doc.status === 'uploaded' || doc.status === 'failed');
}

export function isActive(status: DocumentStatus): boolean {
  return status === 'queued' || status === 'processing';
}
