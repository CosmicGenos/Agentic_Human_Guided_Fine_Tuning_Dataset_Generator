import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { QueryBoundary } from '@/components/shared/query-boundary';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDateTime, formatDuration } from '@/lib/format';
import { useJob } from '../queries';

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export function JobDetail({ jobId, projectId }: { jobId: string; projectId: string }) {
  const job = useJob(jobId, projectId);

  return (
    <QueryBoundary query={job}>
      {(j) => {
        const total = j.documents.length;
        const done = j.documents.filter((d) => d.status === 'completed' || d.status === 'failed').length;
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <StatusBadge status={j.status} />
              <span className="font-mono text-xs text-muted-foreground" title={j.id}>{j.id.slice(0, 8)}</span>
            </div>

            {j.error && (
              <p role="alert" className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay-fg">{j.error}</p>
            )}

            <dl className="grid grid-cols-2 gap-4">
              <Meta label="Queued" value={formatDateTime(j.created_at)} />
              <Meta label="Started" value={formatDateTime(j.started_at)} />
              <Meta label="Finished" value={formatDateTime(j.finished_at)} />
              <Meta label="Took" value={formatDuration(j.started_at, j.finished_at)} />
            </dl>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Documents</span>
                <span>{done} of {total} finished</span>
              </div>
              <Progress value={total ? (done / total) * 100 : 0} aria-label="Job progress" />
            </div>

            <ul className="divide-y divide-border rounded-xl border border-border">
              {j.documents.map((d) => (
                <li key={d.document_id} className="flex flex-col gap-1 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm">{d.original_name}</span>
                    </span>
                    <StatusBadge status={d.status} />
                  </div>
                  {d.error && <p className="pl-6 text-xs text-clay-fg">{d.error}</p>}
                  {d.status === 'completed' && (
                    <Link
                      to={`/app/projects/${projectId}/extractions?doc=${d.document_id}`}
                      className="pl-6 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      View extracted text
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      }}
    </QueryBoundary>
  );
}
