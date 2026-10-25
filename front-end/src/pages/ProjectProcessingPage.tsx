import { useProjectId } from '@/features/projects/use-project-id';
import { ProcessingView } from '@/features/processing/components/ProcessingView';

export default function ProjectProcessingPage() {
  return <ProcessingView projectId={useProjectId()} />;
}

