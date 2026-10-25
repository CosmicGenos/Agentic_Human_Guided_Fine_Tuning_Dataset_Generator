export type DataType = 'fiction' | 'academic';

export const DATA_TYPE_LABEL: Record<DataType, string> = {
  fiction: 'Fiction',
  academic: 'Academic',
};

export interface Project {
  id: string;
  title: string;
  description: string;
  data_type: DataType;
  created_by: string;
  /** True once the first document is processed: the embedder can no longer change. */
  embedding_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectInput {
  title: string;
  description?: string;
  data_type: DataType;
}

export type UpdateProjectInput = Partial<CreateProjectInput>;
