import { Link } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useProject } from '@/features/projects/queries';
import { useMissingStages } from '../queries';
import { STAGE_INFO } from '../types';

/** Shown wherever processing is offered but the project's required models aren't set yet. */
export function ModelsReadinessAlert({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const { missing } = useMissingStages(projectId, project.data?.data_type);
  if (missing.length === 0) return null;

  return (
    <Alert className="mb-4 border-amber/40 bg-amber/10">
      <TriangleAlert className="text-amber-fg" />
      <AlertTitle>Choose models before processing</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span>Still needed: {missing.map((s) => STAGE_INFO[s]?.label ?? s).join(', ')}.</span>
        <Button asChild size="xs" variant="outline">
          <Link to={`/app/projects/${projectId}/models`}>Set up models</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
