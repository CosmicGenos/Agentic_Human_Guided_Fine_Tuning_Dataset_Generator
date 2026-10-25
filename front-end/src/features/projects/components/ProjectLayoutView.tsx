import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft, FolderX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/layout/Panel';
import { RouteTabs } from '@/components/layout/RouteTabs';
import { useProject } from '../queries';
import { useProjectId } from '../use-project-id';
import { DATA_TYPE_LABEL } from '../types';

export function ProjectLayoutView() {
  const projectId = useProjectId();
  const project = useProject(projectId);

  if (project.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading project">
        <Skeleton className="mb-2 h-4 w-20" />
        <Skeleton className="mb-6 h-8 w-72" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (project.isError) {
    // 404 also covers "you're not a member" so project ids can't be guessed
    const notFound = project.error.status === 404 || project.error.status === 403;
    return (
      <Panel>
        <EmptyState
          icon={FolderX}
          title={notFound ? 'Project not found' : 'Couldn’t load this project'}
          description={notFound ? 'It may have been deleted, or you may not be a member.' : project.error.message}
          action={<Button asChild variant="outline" size="sm"><Link to="/app/projects">Back to projects</Link></Button>}
        />
      </Panel>
    );
  }

  const base = `/app/projects/${projectId}`;
  return (
    <>
      <PageHeader
        eyebrow={
          <Link to="/app/projects" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Projects
          </Link>
        }
        title={
          <span className="flex items-center gap-3">
            <span className="truncate">{project.data.title}</span>
            <Badge variant="outline" className="shrink-0 font-sans">{DATA_TYPE_LABEL[project.data.data_type]}</Badge>
          </span>
        }
        description={project.data.description || undefined}
      />
      <RouteTabs
        label="Project sections"
        tabs={[
          { label: 'Overview', to: base, end: true },
          { label: 'Documents', to: `${base}/documents` },
          { label: 'Processing', to: `${base}/processing` },
          { label: 'Extractions', to: `${base}/extractions` },
          { label: 'Members', to: `${base}/members` },
          { label: 'Models', to: `${base}/models` },
        ]}
      />
      <Outlet />
    </>
  );
}
