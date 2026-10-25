import { useProjectId } from '@/features/projects/use-project-id';
import { ProjectOverview } from '@/features/projects/components/ProjectOverview';

export default function ProjectOverviewPage() {
  return <ProjectOverview projectId={useProjectId()} />;
}

