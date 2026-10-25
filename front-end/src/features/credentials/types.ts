export type Provider =
  | 'openai' | 'anthropic' | 'google' | 'groq' | 'mistral' | 'together' | 'openrouter'
  | 'cohere' | 'voyageai' | 'jina'
  | 'ollama' | 'azure_openai';

export type ModelStage =
  | 'meta_agent' | 'embedder' | 'vision'
  | 'question_generator' | 'answer_generator' | 'validator' | 'reranker';

export type ModelCapability = 'chat' | 'embedding' | 'rerank' | 'vision';

/** catalog = pick from known models; registered = an admin registers models on the connection first. */
export type ModelSource = 'catalog' | 'registered';

export type RegisteredModelStatus = 'untested' | 'ok' | 'failed';

export interface ProviderSchema {
  provider: Provider;
  label: string;
  secret_fields: string[];
  optional_secret_fields: string[];
  settings_fields: string[];
  default_settings: Record<string, string>;
  model_source: ModelSource;
  live_listing: boolean;
  /** Ollama / Azure get a full configuration page for their models. */
  config_page: boolean;
}

export interface Credential {
  id: string;
  name: string;
  provider: Provider;
  /** Names of stored secrets, never their values. */
  secrets_present: string[];
  settings: Record<string, string>;
  used_by_projects: { project_id: string; title: string }[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** What a project owner picks from (no admin-only detail). */
export interface CredentialOption {
  id: string;
  name: string;
  provider: Provider;
}

export interface CreateCredentialInput {
  name: string;
  provider: Provider;
  secrets: Record<string, string>;
  settings: Record<string, string>;
}

/** `secrets` / `settings` each REPLACE all stored values when sent; omit to keep them. */
export interface UpdateCredentialInput {
  name?: string;
  secrets?: Record<string, string>;
  settings?: Record<string, string>;
}

export interface ConnectionTestResult {
  /** null: this provider can't be tested without choosing a model. */
  ok: boolean | null;
  message: string;
}

export interface ModelOption {
  name: string;
  capabilities: ModelCapability[];
  context_window: number | null;
  embedding_dim: number | null;
  status: RegisteredModelStatus | null;
}

export interface ModelOptionsResponse {
  credential_id: string;
  provider: Provider;
  stage: ModelStage | null;
  source: ModelSource;
  provider_checked: boolean;
  warning: string | null;
  /** The UI may offer "Other…" (typed name, tested on save). */
  allow_custom: boolean;
  models: ModelOption[];
}

export interface RegisteredModel {
  id: string;
  credential_id: string;
  name: string;
  base_model: string | null;
  capabilities: ModelCapability[];
  embedding_dim: number | null;
  context_window: number | null;
  status: RegisteredModelStatus;
  last_error: string | null;
  last_checked_at: string | null;
  created_at: string;
}

export interface RegisterModelInput {
  name: string;
  base_model?: string;
  capabilities?: ModelCapability[];
}

export const PROVIDER_LABEL: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google Gemini',
  groq: 'Groq',
  mistral: 'Mistral',
  together: 'Together AI',
  openrouter: 'OpenRouter',
  cohere: 'Cohere',
  voyageai: 'Voyage AI',
  jina: 'Jina AI',
  ollama: 'Ollama',
  azure_openai: 'Azure OpenAI',
};

const FIELD_LABEL: Record<string, string> = {
  api_key: 'API key',
  base_url: 'Base URL',
  endpoint: 'Endpoint',
  api_version: 'API version',
};

export function fieldLabel(field: string): string {
  return FIELD_LABEL[field] ?? field.replace(/_/g, ' ');
}
