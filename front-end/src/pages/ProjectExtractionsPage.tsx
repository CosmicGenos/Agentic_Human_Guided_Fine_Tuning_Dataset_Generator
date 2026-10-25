import { useProjectId } from '@/features/projects/use-project-id';
import { ExtractionsView } from '@/features/extractions/components/ExtractionsView';

export default function ProjectExtractionsPage() {
  return <ExtractionsView projectId={useProjectId()} />;
}

