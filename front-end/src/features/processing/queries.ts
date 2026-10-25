import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api-error';
import { documentKeys } from '@/features/documents/queries';
import { extractionKeys } from '@/features/extractions/queries';
import { processingApi } from './api';
import { isJobActive } from './types';
import type { Job, JobSummary } from './types';

export const processingKeys = {
  jobs: (projectId: string) => ['projects', projectId, 'jobs'] as const,
  job: (jobId: string) => ['jobs', jobId] as const,
};

/** Polls while any job is queued or running. */
export function useJobs(projectId: string) {
  return useQuery<JobSummary[], ApiError>({
    queryKey: processingKeys.jobs(projectId),
    queryFn: () => processingApi.list(projectId),
    refetchInterval: (query) => (query.state.data?.some((j) => isJobActive(j.status)) ? 4000 : false),
  });
}

/** Polls while the job is queued or running; stays quiet once it's finished. */
export function useJob(jobId: string | null, projectId: string) {
  const qc = useQueryClient();
  return useQuery<Job, ApiError>({
    queryKey: processingKeys.job(jobId ?? ''),
    queryFn: async () => {
      const job = await processingApi.get(jobId!);
      // keep the lists in step with what the job just did
      if (!isJobActive(job.status)) {
        void qc.invalidateQueries({ queryKey: processingKeys.jobs(projectId) });
        void qc.invalidateQueries({ queryKey: documentKeys.list(projectId) });
        void qc.invalidateQueries({ queryKey: extractionKeys.list(projectId) });
      }
      return job;
    },
    enabled: !!jobId,
    refetchInterval: (query) => (query.state.data && isJobActive(query.state.data.status) ? 3000 : false),
  });
}

export function useStartProcessing(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentIds?: string[]) => processingApi.start(projectId, documentIds),
    onSuccess: () => {
      toast.success('Processing started');
      void qc.invalidateQueries({ queryKey: documentKeys.list(projectId) });
      return qc.invalidateQueries({ queryKey: processingKeys.jobs(projectId) });
    },
  });
}
