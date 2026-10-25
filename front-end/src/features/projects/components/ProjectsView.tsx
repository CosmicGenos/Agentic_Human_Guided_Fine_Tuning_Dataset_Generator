import { useNavigate } from 'react-router-dom';
import { FolderKanban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DataGrid, useGridQuery, useLocalGrid } from '@/components/data-grid';
import type { GridColumn } from '@/components/data-grid';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate, formatRelative } from '@/lib/format';
import { useProjects } from '../queries';
import { DATA_TYPE_LABEL } from '../types';
import type { DataType, Project } from '../types';
import { CreateProjectDialog } from './CreateProjectDialog';

const columns: GridColumn<Project>[] = [
  {
    id: 'title',
    header: 'Project',
    width: 340,
    accessor: (p) => p.title,
    filter: { type: 'text' },
    cell: (p) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{p.title}</p>
        {p.description && <p className="truncate text-xs text-muted-foreground">{p.description}</p>}
      </div>
    ),
  },
  {
    id: 'data_type',
    header: 'Type',
    width: 140,
    accessor: (p) => p.data_type,
    filter: { type: 'select', options: (Object.keys(DATA_TYPE_LABEL) as DataType[]).map((v) => ({ value: v, label: DATA_TYPE_LABEL[v] })) },
    cell: (p) => <Badge variant="outline">{DATA_TYPE_LABEL[p.data_type]}</Badge>,
  },
  {
    id: 'updated_at',
    header: 'Updated',
    width: 160,
    accessor: (p) => p.updated_at,
    filter: { type: 'date' },
    cell: (p) => <span className="text-muted-foreground" title={p.updated_at}>{formatRelative(p.updated_at)}</span>,
  },
  {
    id: 'created_at',
    header: 'Created',
    width: 140,
    defaultHidden: true,
    accessor: (p) => p.created_at,
    filter: { type: 'date' },
    cell: (p) => <span className="text-muted-foreground">{formatDate(p.created_at)}</span>,
  },
];

export function ProjectsView() {
  const navigate = useNavigate();
  const projects = useProjects();
  const [query, setQuery] = useGridQuery({ storageKey: 'projects', sort: [{ field: 'updated_at', dir: 'desc' }] });
  const page = useLocalGrid(projects.data, columns, query);

  return (
    <>
      <PageHeader
        title="Projects"
        description="Each project holds its documents, models and team."
        actions={<CreateProjectDialog />}
      />

      <DataGrid
        label="Projects"
        storageKey="projects"
        columns={columns}
        rows={page.rows}
        total={page.total}
        getRowId={(p) => p.id}
        query={query}
        onQueryChange={setQuery}
        loading={projects.isPending}
        fetching={projects.isFetching}
        error={projects.error?.message}
        onRetry={() => void projects.refetch()}
        onRefresh={() => void projects.refetch()}
        searchPlaceholder="Search projects…"
        onRowClick={(p) => navigate(`/app/projects/${p.id}`)}
        emptyState={
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create a project, upload documents, then choose the models that process them."
            action={<CreateProjectDialog />}
          />
        }
      />
    </>
  );
}
