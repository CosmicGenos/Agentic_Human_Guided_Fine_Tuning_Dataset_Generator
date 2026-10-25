import { api } from '@/lib/api';
import type { ModelStage } from '@/features/credentials/types';
import type { ModelConfig, StageAssignments, ValidateModelConfigResponse } from './types';

// Each stage is test-called with the real model, which can take a while (Ollama loads models).
const SLOW = { timeout: 120_000 };

export const modelConfigApi = {
  get: (projectId: string) => api.get<ModelConfig>(`/projects/${projectId}/model-config`).then((r) => r.data),

  /** Adds/updates the stages sent; others are left alone. Nothing is saved if any test call fails. */
  save: (projectId: string, stages: StageAssignments) =>
    api.put<ModelConfig>(`/projects/${projectId}/model-config`, { stages }, SLOW).then((r) => r.data),

  removeStage: (projectId: string, stage: ModelStage) =>
    api.delete(`/projects/${projectId}/model-config/${stage}`).then(() => undefined),

  /** Same checks and test calls as save, but saves nothing. */
  validate: (projectId: string, stages: StageAssignments) =>
    api.post<ValidateModelConfigResponse>(`/projects/${projectId}/model-config/validate`, { stages }, SLOW).then((r) => r.data),
};
