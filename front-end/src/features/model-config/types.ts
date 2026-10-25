import type { DataType } from '@/features/projects/types';
import type { ModelStage, Provider } from '@/features/credentials/types';

export interface StageModel {
  stage: ModelStage;
  credential_id: string;
  credential_name: string;
  provider: Provider;
  model_name: string;
  /** Measured by the test call when saved; never typed. */
  embedding_dim: number | null;
  updated_at: string;
}

export interface ModelConfig {
  project_id: string;
  /** After the first document is processed the embedder can't change. */
  embedding_locked: boolean;
  stages: StageModel[];
}

export interface StageAssignment {
  credential_id: string;
  model_name: string;
}

export type StageAssignments = Partial<Record<ModelStage, StageAssignment>>;

export interface StageValidationResult {
  stage: ModelStage;
  ok: boolean;
  embedding_dim: number | null;
  error: string | null;
}

export interface ValidateModelConfigResponse {
  all_ok: boolean;
  results: StageValidationResult[];
}

/**
 * The stages the app can use today. question_generator, answer_generator, validator
 * and reranker exist in the API but belong to QA generation / search, which isn't built.
 */
export const ACTIVE_STAGES: ModelStage[] = ['meta_agent', 'embedder', 'vision'];

export const STAGE_INFO: Record<string, { label: string; description: string }> = {
  meta_agent: {
    label: 'Context writer',
    description: 'Writes a short context note for every chunk. Needs a chat model.',
  },
  embedder: {
    label: 'Embedder',
    description: 'Turns text into vectors for search. Needs an embedding model. Locks after the first document is processed.',
  },
  vision: {
    label: 'Vision',
    description: 'Describes images and figures in academic papers. Needs a vision-capable model.',
  },
};

/** Stages a project must have before documents can be processed (mirrors ProcessingService). */
export function requiredStages(dataType: DataType): ModelStage[] {
  return dataType === 'academic' ? ['meta_agent', 'embedder', 'vision'] : ['meta_agent', 'embedder'];
}
