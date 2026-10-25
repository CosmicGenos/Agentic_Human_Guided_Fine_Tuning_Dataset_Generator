import { useSearchParams } from 'react-router-dom';
import { Cog } from 'lucide-react';
import { DataGrid, EMPTY_SELECTION, useGridQuery, useLocalGrid } from '@/components/data-grid';
import type { GridColumn, SelectionState } from '@/components/data-grid';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Panel } from '@/components/layout/Panel';
import { SplitView } from '@/components/layout/SplitView';
import { ModelsReadinessAlert } from '@/features/model-config/components/ModelsReadinessAlert';
import { formatDateTime, formatDuration } from '@/lib/format';
import { useJobs } from '../queries';
import type { JobStatus, JobSummary } from '../types';
import { JobDetail } from './JobDetail';
import { StartProcessingButton } from './StartProcessingButton';

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'partial', label: 'Partial' },
  { value: 'failed', label: 'Failed' },
];

const seconds = (j: JobSummary) =>
  j.started_at ? ((j.finished_at ? new Date(j.finished_at).getTime() : Date.now()) - new Date(j.started_at).getTime()) / 1000 : null;

const columns: GridColumn<JobSummary>[] = [
  {
    id: 'created_at',
    header: 'Queued',
    width: 200,
    accessor: (j) => j.created_at,
    filter: { type: 'date' },
    cell: (j) => (
      <div>
        <p className="font-medium">{formatDateTime(j.created_at)}</p>
        <p className="font-mono text-xs text-muted-foreground">{j.id.slice(0, 8)}</p>
      </div>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    width: 140,
    accessor: (j) => j.status,
    filter: { type: 'select', options: STATUS_OPTIONS },
    cell: (j) => <StatusBadge status={j.status} />,
  },
  {
    id: 'took',
    header: 'Took',
    width: 110,
    accessor: seconds,
    cell: (j) => <span className="text-muted-foreground">{formatDuration(j.started_at, j.finished_at)}</span>,
  },
  {
    id: 'id',
    header: 'Job id',
    width: 160,
    defaultHidden: true,
    accessor: (j) => j.id,
    cell: (j) => <span className="font-mono text-xs">{j.id}</span>,
  },
];

export function ProcessingView({ projectId }: { projectId: string }) {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('job');
  const jobs = useJobs(projectId);
  const [query, setQuery] = useGridQuery({ storageKey: 'jobs', sort: [{ field: 'created_at', dir: 'desc' }] });
  const page = useLocalGrid(jobs.data, columns, query);

  // the URL is the source of truth for the selected job, so links and refresh keep it
  const selected: SelectionState = selectedId ? { mode: 'ids', ids: new Set([selectedId]) } : EMPTY_SELECTION;

  return (
    <>
      <ModelsReadinessAlert projectId={projectId} />
      <SplitView
        ratio="side-right"
        fill
        primary={
          <DataGrid
            label="Processing jobs"
            storageKey="jobs"
            className="lg:min-h-0"
            title="Processing jobs"
            description="Newest first. Pick one to see each document."
            actions={<StartProcessingButton projectId={projectId} label="Process pending documents" size="sm" />}
            columns={columns}
            rows={page.rows}
            total={page.total}
            getRowId={(j) => j.id}
            query={query}
            onQueryChange={setQuery}
            loading={jobs.isPending}
            fetching={jobs.isFetching}
            error={jobs.error?.message}
            onRetry={() => void jobs.refetch()}
            onRefresh={() => void jobs.refetch()}
            selection="single"
            selected={selected}
            onSelectedChange={(s) => {
              const id = s.mode === 'ids' ? [...s.ids][0] : undefined;
              setParams(id ? { job: id } : {}, { replace: true });
            }}
            emptyState={<EmptyState icon={Cog} title="Nothing processed yet" description="Upload PDFs on the Documents tab, then start processing." />}
          />
        }
        secondary={
          <Panel title="Job details" className="min-h-64">
            {selectedId ? (
              <JobDetail jobId={selectedId} projectId={projectId} />
            ) : (
              <p className="text-sm text-muted-foreground">Select a job to see its documents and progress.</p>
            )}
          </Panel>
        }
      />
    </>
  );
}
