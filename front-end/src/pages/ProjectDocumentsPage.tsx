import { useProjectId } from '@/features/projects/use-project-id';
import { DocumentsView } from '@/features/documents/components/DocumentsView';

export default function ProjectDocumentsPage() {
  return <DocumentsView projectId={useProjectId()} />;
}

