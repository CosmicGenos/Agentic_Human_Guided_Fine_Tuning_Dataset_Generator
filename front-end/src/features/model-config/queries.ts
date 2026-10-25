import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api-error';
import type { ModelStage } from '@/features/credentials/types';
import type { DataType } from '@/features/projects/types';
import { modelConfigApi } from './api';
import { requiredStages } from './types';
import type { ModelConfig, StageAssignments } from './types';

export const modelConfigKeys = {
  detail: (projectId: string) => ['projects', projectId, 'model-config'] as const,
};

export function useModelConfig(projectId: string) {
  return useQuery<ModelConfig, ApiError>({
    queryKey: modelConfigKeys.detail(projectId),
    queryFn: () => modelConfigApi.get(projectId),
  });
}

export function useSaveModelConfig(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stages: StageAssignments) => modelConfigApi.save(projectId, stages),
    onSuccess: (config) => {
      qc.setQueryData(modelConfigKeys.detail(projectId), config);
      toast.success('Models saved');
    },
  });
}

export function useRemoveStage(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stage: ModelStage) => modelConfigApi.removeStage(projectId, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: modelConfigKeys.detail(projectId) }),
  });
}

/** Dry run: results are shown in the dialog, so no error toast on a failed test. */
export function useValidateModelConfig(projectId: string) {
  return useMutation({
    mutationFn: (stages: StageAssignments) => modelConfigApi.validate(projectId, stages),
    meta: { silent: true },
  });
}

/** Required stages the project hasn't configured yet (processing is refused until this is empty). */
export function useMissingStages(projectId: string, dataType: DataType | undefined) {
  const config = useModelConfig(projectId);
  if (!dataType || !config.data) return { missing: [] as ModelStage[], isLoading: config.isPending };
  const have = new Set(config.data.stages.map((s) => s.stage));
  return { missing: requiredStages(dataType).filter((s) => !have.has(s)), isLoading: false };
}
