import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api-error';
import { credentialsApi } from './api';
import type {
  Credential,
  CredentialOption,
  ModelOptionsResponse,
  ModelStage,
  ProviderSchema,
  RegisteredModel,
  RegisterModelInput,
  UpdateCredentialInput,
} from './types';

export const credentialKeys = {
  all: ['credentials'] as const,
  schema: () => [...credentialKeys.all, 'schema'] as const,
  options: () => [...credentialKeys.all, 'options'] as const,
  list: () => [...credentialKeys.all, 'list'] as const,
  detail: (id: string) => [...credentialKeys.all, 'detail', id] as const,
  models: (id: string, stage?: ModelStage) => [...credentialKeys.all, 'models', id, stage ?? 'all'] as const,
  registered: (id: string) => [...credentialKeys.all, 'registered', id] as const,
};

export function useProviderSchemas() {
  // static for the life of the server
  return useQuery<ProviderSchema[], ApiError>({ queryKey: credentialKeys.schema(), queryFn: credentialsApi.schema, staleTime: Infinity });
}

export function useCredentialOptions() {
  return useQuery<CredentialOption[], ApiError>({ queryKey: credentialKeys.options(), queryFn: credentialsApi.options });
}

export function useCredentials() {
  return useQuery<Credential[], ApiError>({ queryKey: credentialKeys.list(), queryFn: credentialsApi.list });
}

export function useCredential(id: string) {
  return useQuery<Credential, ApiError>({ queryKey: credentialKeys.detail(id), queryFn: () => credentialsApi.get(id) });
}

export function useCreateCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: credentialsApi.create,
    onSuccess: (c) => {
      toast.success(`${c.name} added`);
      return qc.invalidateQueries({ queryKey: credentialKeys.all });
    },
  });
}

export function useUpdateCredential(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCredentialInput) => credentialsApi.update(id, input),
    onSuccess: () => {
      toast.success('Connection saved');
      // models listed for this connection may change with the key/endpoint
      return qc.invalidateQueries({ queryKey: credentialKeys.all });
    },
  });
}

export function useDeleteCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: credentialsApi.remove,
    onSuccess: () => {
      toast.success('Connection deleted');
      return qc.invalidateQueries({ queryKey: credentialKeys.all });
    },
  });
}

export function useTestCredential() {
  return useMutation({
    mutationFn: credentialsApi.test,
    meta: { silent: true },
    onSuccess: (r) => {
      if (r.ok === true) toast.success(r.message);
      else if (r.ok === false) toast.error(r.message);
      else toast.info(r.message);
    },
    onError: (e) => toast.error(e.message),
  });
}

/** Model dropdown for one stage of a credential. */
export function useModelOptions(credentialId: string | null, stage: ModelStage) {
  return useQuery<ModelOptionsResponse, ApiError>({
    queryKey: credentialKeys.models(credentialId ?? '', stage),
    queryFn: () => credentialsApi.models(credentialId!, stage),
    enabled: !!credentialId,
    staleTime: 60_000,
  });
}

export function useRegisteredModels(credentialId: string, enabled = true) {
  return useQuery<RegisteredModel[], ApiError>({
    queryKey: credentialKeys.registered(credentialId),
    queryFn: () => credentialsApi.registeredModels(credentialId),
    enabled,
  });
}

export function useRegisterModel(credentialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterModelInput) => credentialsApi.registerModel(credentialId, input),
    onSuccess: (m) => {
      if (m.status === 'failed') toast.warning(`${m.name} was saved but its test failed`, { description: m.last_error ?? undefined });
      else toast.success(`${m.name} registered`);
      return qc.invalidateQueries({ queryKey: credentialKeys.all });
    },
  });
}

export function useSyncModels(credentialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (test: boolean) => credentialsApi.syncModels(credentialId, test),
    onSuccess: (models) => {
      toast.success(`Synced ${models.length} model${models.length === 1 ? '' : 's'} from the server`);
      return qc.invalidateQueries({ queryKey: credentialKeys.all });
    },
  });
}

export function useTestRegisteredModel(credentialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (modelId: string) => credentialsApi.testModel(credentialId, modelId),
    onSuccess: (m) => {
      if (m.status === 'ok') toast.success(`${m.name} works`);
      else toast.error(`${m.name} failed`, { description: m.last_error ?? undefined });
      return qc.invalidateQueries({ queryKey: credentialKeys.all });
    },
  });
}

export function useRemoveRegisteredModel(credentialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (modelId: string) => credentialsApi.removeModel(credentialId, modelId),
    onSuccess: () => {
      toast.success('Model removed');
      return qc.invalidateQueries({ queryKey: credentialKeys.all });
    },
  });
}
