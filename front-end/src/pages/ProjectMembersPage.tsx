import { useProjectId } from '@/features/projects/use-project-id';
import { MembersView } from '@/features/members/components/MembersView';

export default function ProjectMembersPage() {
  return <MembersView projectId={useProjectId()} />;
}

