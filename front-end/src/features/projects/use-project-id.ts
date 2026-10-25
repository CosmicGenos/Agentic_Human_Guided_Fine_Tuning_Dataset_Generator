import { useParams } from 'react-router-dom';

/** The `:projectId` of the current /app/projects/:projectId/* route. */
export function useProjectId(): string {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) throw new Error('useProjectId used outside /app/projects/:projectId');
  return projectId;
}
