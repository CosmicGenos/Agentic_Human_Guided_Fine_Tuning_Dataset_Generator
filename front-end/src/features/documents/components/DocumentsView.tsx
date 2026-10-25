import { useMemo, useState } from 'react';
import { FileImage, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataGrid, EMPTY_SELECTION, resolveSelection, useGridQuery, useLocalGrid } from '@/components/data-grid';
import type { GridColumn, SelectionState } from '@/components/data-grid';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { ModelsReadinessAlert } from '@/features/model-config/components/ModelsReadinessAlert';
import { StartProcessingButton } from '@/features/processing/components/StartProcessingButton';
import { formatBytes, formatRelative } from '@/lib/format';
import { useDeleteDocument, useDocuments } from '../queries';
import { isActive, isPending, isProcessable } from '../types';
import type { DocumentStatus, FileType, ProjectDocument } from '../types';
import { UploadDropzone } from './UploadDropzone';

const STATUS_OPTIONS: { value: DocumentStatus; label: string }[] = [
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'queued', label: 'Queued' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];
const TYPE_OPTIONS: { value: FileType; label: string }[] = [{ value: 'pdf', label: 'PDF' }, { value: 'images', label: 'Images' }];

export function DocumentsView({ projectId }: { projectId: string }) {
  const documents = useDocuments(projectId);
  const remove = useDeleteDocument(projectId);
  const [toDelete, setToDelete] = useState<ProjectDocument | null>(null);
  const [selected, setSelected] = useState<SelectionState>(EMPTY_SELECTION);
  const [query, setQuery] = useGridQuery({ storageKey: 'documents', sort: [{ field: 'created_at', dir: 'desc' }] });

  const columns = useMemo<GridColumn<ProjectDocument>[]>(
    () => [
      {
        id: 'original_name',
        header: 'Document',
        width: 340,
        accessor: (d) => d.original_name,
        filter: { type: 'text' },
        cell: (d) => {
          const Icon = d.file_type === 'pdf' ? FileText : FileImage;
          return (
            <div className="flex min-w-0 items-center gap-2.5">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate font-medium">{d.original_name}</p>
                {d.error && <p className="truncate text-xs text-clay-fg" title={d.error}>{d.error}</p>}
              </div>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        width: 150,
        accessor: (d) => d.status,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cell: (d) => <StatusBadge status={d.status} />,
      },
      { id: 'file_type', header: 'Type', width: 100, accessor: (d) => d.file_type, filter: { type: 'select', options: TYPE_OPTIONS }, cell: (d) => <span className="uppercase text-muted-foreground">{d.file_type}</span> },
      {
        id: 'size_bytes',
        header: 'Size',
        width: 110,
        align: 'right',
        accessor: (d) => d.size_bytes,
        filter: { type: 'number' },
        cell: (d) => <span className="text-muted-foreground">{formatBytes(d.size_bytes)}</span>,
      },
      {
        id: 'created_at',
        header: 'Uploaded',
        width: 150,
        accessor: (d) => d.created_at,
        filter: { type: 'date' },
        cell: (d) => <span className="text-muted-foreground" title={d.created_at}>{formatRelative(d.created_at)}</span>,
      },
      {
        id: 'processed_at',
        header: 'Processed',
        width: 150,
        defaultHidden: true,
        accessor: (d) => d.processed_at,
        filter: { type: 'date' },
        cell: (d) => <span className="text-muted-foreground">{formatRelative(d.processed_at)}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        hideHeader: true,
        width: 70,
        align: 'right',
        sortable: false,
        resizable: false,
        hideable: false,
        reorderable: false,
        searchable: false,
        cell: (d) => (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${d.original_name}`}
            disabled={isActive(d.status)}
            title={isActive(d.status) ? 'Wait for processing to finish' : undefined}
            onClick={() => setToDelete(d)}
          >
            <Trash2 />
          </Button>
        ),
      },
    ],
    [],
  );

  const page = useLocalGrid(documents.data, columns, query);

  const getId = (d: ProjectDocument) => d.id;
  // what "Process selected" will actually send: PDFs that aren't already in flight
  const processable = resolveSelection(selected, page.matching, getId).filter((d) => isProcessable(d) && !isActive(d.status));
  const pendingCount = documents.data?.filter(isPending).length ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ModelsReadinessAlert projectId={projectId} />
      <UploadDropzone projectId={projectId} />

      <DataGrid
        label="Documents"
        storageKey="documents"
        title="Documents"
        actions={
          <StartProcessingButton
            projectId={projectId}
            label={pendingCount ? `Process ${pendingCount} pending` : 'Process pending'}
            size="sm"
            variant="outline"
            disabled={pendingCount === 0}
          />
        }
        columns={columns}
        rows={page.rows}
        total={page.total}
        getRowId={getId}
        query={query}
        onQueryChange={setQuery}
        loading={documents.isPending}
        fetching={documents.isFetching}
        error={documents.error?.message}
        onRetry={() => void documents.refetch()}
        onRefresh={() => void documents.refetch()}
        searchPlaceholder="Search documents…"
        selection="multiple"
        selected={selected}
        onSelectedChange={setSelected}
        selectionActions={
          <StartProcessingButton
            projectId={projectId}
            documentIds={processable.map(getId)}
            label={`Process ${processable.length}`}
            size="xs"
            disabled={processable.length === 0}
          />
        }
        emptyState={<EmptyState icon={FileText} title="No documents yet" description="Drop PDFs above to add them to this project." />}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this document?"
        description={<>“{toDelete?.original_name}” and everything extracted from it (text, images, vectors) will be removed.</>}
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
        onConfirm={async () => {
          await remove.mutateAsync(toDelete!.id);
          setSelected((prev) => {
            if (prev.mode === 'ids') {
              const ids = new Set(prev.ids);
              ids.delete(toDelete!.id);
              return { mode: 'ids', ids };
            }
            return prev;
          });
        }}
      />
    </div>
  );
}
