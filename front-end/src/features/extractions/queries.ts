import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api-error';
import { extractionsApi } from './api';
import type { Extraction, ExtractionDetail } from './types';

export const extractionKeys = {
  list: (projectId: string) => ['projects', projectId, 'extractions'] as const,
  detail: (documentId: string) => ['documents', documentId, 'extraction'] as const,
};

export function useExtractions(projectId: string) {
  return useQuery<Extraction[], ApiError>({
    queryKey: extractionKeys.list(projectId),
    queryFn: () => extractionsApi.list(projectId),
  });
}

export function useExtraction(documentId: string | null) {
  return useQuery<ExtractionDetail, ApiError>({
    queryKey: extractionKeys.detail(documentId ?? ''),
    queryFn: () => extractionsApi.get(documentId!),
    enabled: !!documentId,
    staleTime: 5 * 60_000, // extracted text doesn't change
  });
}
