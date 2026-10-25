import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ScanText } from 'lucide-react';
import { DataGrid, EMPTY_SELECTION, useGridQuery, useLocalGrid } from '@/components/data-grid';
import type { GridColumn, SelectionState } from '@/components/data-grid';
import { EmptyState } from '@/components/shared/empty-state';
import { Panel } from '@/components/layout/Panel';
import { SplitView } from '@/components/layout/SplitView';
import { useDocuments } from '@/features/documents/queries';
import { formatNumber, formatRelative } from '@/lib/format';
import { useExtractions } from '../queries';
import type { Extraction } from '../types';
import { ExtractionViewer } from './ExtractionViewer';

export function ExtractionsView({ projectId }: { projectId: string }) {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('doc');
  const extractions = useExtractions(projectId);
  const documents = useDocuments(projectId);
  const [query, setQuery] = useGridQuery({ storageKey: 'extractions', sort: [{ field: 'created_at', dir: 'desc' }] });

  const names = useMemo(() => new Map((documents.data ?? []).map((d) => [d.id, d.original_name])), [documents.data]);
  const nameOf = (id: string) => names.get(id) ?? id.slice(0, 8);

  const columns = useMemo<GridColumn<Extraction>[]>(
    () => [
      {
        id: 'name',
        header: 'Document',
        width: 280,
        accessor: (x) => names.get(x.document_id) ?? x.document_id,
        filter: { type: 'text' },
        cell: (x) => <span className="font-medium">{names.get(x.document_id) ?? x.document_id.slice(0, 8)}</span>,
      },
      {
        id: 'char_count',
        header: 'Characters',
        width: 130,
        align: 'right',
        accessor: (x) => x.char_count,
        filter: { type: 'number' },
        cell: (x) => <span className="text-muted-foreground">{formatNumber(x.char_count)}</span>,
      },
      {
        id: 'image_count',
        header: 'Images',
        width: 100,
        align: 'right',
        accessor: (x) => x.image_count,
        filter: { type: 'number' },
        cell: (x) => <span className="text-muted-foreground">{x.image_count}</span>,
      },
      {
        id: 'pages',
        header: 'Pages',
        width: 100,
        align: 'right',
        defaultHidden: true,
        accessor: (x) => (typeof x.metadata['page_count'] === 'number' ? x.metadata['page_count'] : null),
        filter: { type: 'number' },
      },
      {
        id: 'created_at',
        header: 'Extracted',
        width: 150,
        accessor: (x) => x.created_at,
        filter: { type: 'date' },
        cell: (x) => <span className="text-muted-foreground">{formatRelative(x.created_at)}</span>,
      },
    ],
    [names],
  );

  const page = useLocalGrid(extractions.data, columns, query);
  const selected: SelectionState = selectedId ? { mode: 'ids', ids: new Set([selectedId]) } : EMPTY_SELECTION;

  return (
    <SplitView
      ratio="even"
      fill
      primary={
        <DataGrid
          label="Extracted documents"
          storageKey="extractions"
          className="lg:min-h-0"
          title="Extracted documents"
          description="Only documents that finished processing appear here."
          columns={columns}
          rows={page.rows}
          total={page.total}
          getRowId={(x) => x.document_id}
          query={query}
          onQueryChange={setQuery}
          loading={extractions.isPending}
          fetching={extractions.isFetching}
          error={extractions.error?.message}
          onRetry={() => void extractions.refetch()}
          onRefresh={() => void extractions.refetch()}
          searchPlaceholder="Search documents…"
          selection="single"
          selected={selected}
          onSelectedChange={(s) => {
            const id = s.mode === 'ids' ? [...s.ids][0] : undefined;
            setParams(id ? { doc: id } : {}, { replace: true });
          }}
          emptyState={<EmptyState icon={ScanText} title="Nothing extracted yet" description="Process documents first; their text shows up here." />}
        />
      }
      secondary={
        <Panel title={selectedId ? nameOf(selectedId) : 'Extracted text'}>
          {selectedId ? (
            <ExtractionViewer key={selectedId} documentId={selectedId} />
          ) : (
            <p className="text-sm text-muted-foreground">Select a document to read what was extracted from it.</p>
          )}
        </Panel>
      }
    />
  );
}
