import { api } from '@/lib/api';
import type {
  ConnectionTestResult,
  CreateCredentialInput,
  Credential,
  CredentialOption,
  ModelOptionsResponse,
  ModelStage,
  ProviderSchema,
  RegisteredModel,
  RegisterModelInput,
  UpdateCredentialInput,
} from './types';

export const credentialsApi = {
  /** Which form each provider needs (any signed-in user). */
  schema: () => api.get<ProviderSchema[]>('/credentials/schema').then((r) => r.data),
  /** id + name + provider only: what a project owner picks from (any signed-in user). */
  options: () => api.get<CredentialOption[]>('/credentials/options').then((r) => r.data),

  // admin only
  list: () => api.get<Credential[]>('/credentials').then((r) => r.data),
  get: (id: string) => api.get<Credential>(`/credentials/${id}`).then((r) => r.data),
  create: (input: CreateCredentialInput) => api.post<Credential>('/credentials', input).then((r) => r.data),
  update: (id: string, input: UpdateCredentialInput) => api.patch<Credential>(`/credentials/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete(`/credentials/${id}`).then(() => undefined),
  test: (id: string) => api.post<ConnectionTestResult>(`/credentials/${id}/test`).then((r) => r.data),

  /** The model dropdown for one stage (any signed-in user). */
  models: (id: string, stage?: ModelStage) =>
    api.get<ModelOptionsResponse>(`/credentials/${id}/models`, { params: stage ? { stage } : undefined }).then((r) => r.data),

  // registered models (Ollama / Azure), admin only
  registeredModels: (id: string) =>
    api.get<RegisteredModel[]>(`/credentials/${id}/registered-models`).then((r) => r.data),
  registerModel: (id: string, input: RegisterModelInput) =>
    api.post<RegisteredModel>(`/credentials/${id}/registered-models`, input).then((r) => r.data),
  /** Ollama only: reads the models downloaded on the server. `test` also test-calls each (slow). */
  syncModels: (id: string, test: boolean) =>
    api.post<RegisteredModel[]>(`/credentials/${id}/registered-models/sync`, null, { params: { test }, timeout: 0 }).then((r) => r.data),
  testModel: (id: string, modelId: string) =>
    api.post<RegisteredModel>(`/credentials/${id}/registered-models/${modelId}/test`, null, { timeout: 0 }).then((r) => r.data),
  removeModel: (id: string, modelId: string) =>
    api.delete(`/credentials/${id}/registered-models/${modelId}`).then(() => undefined),
};
