import { useProjectId } from '@/features/projects/use-project-id';
import { ModelConfigView } from '@/features/model-config/components/ModelConfigView';

export default function ProjectModelsPage() {
  return <ModelConfigView projectId={useProjectId()} />;
}

