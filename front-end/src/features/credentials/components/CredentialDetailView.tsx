import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Boxes, PlugZap, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DataGrid, useGridQuery, useLocalGrid } from '@/components/data-grid';
import type { GridColumn } from '@/components/data-grid';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/layout/Panel';
import { formatNumber, formatRelative } from '@/lib/format';
import {
  useCredential,
  useProviderSchemas,
  useRegisteredModels,
  useRemoveRegisteredModel,
  useSyncModels,
  useTestCredential,
  useTestRegisteredModel,
} from '../queries';
import { PROVIDER_LABEL } from '../types';
import type { RegisteredModel, RegisteredModelStatus } from '../types';
import { RegisterModelDialog } from './RegisterModelDialog';

const STATUS_OPTIONS: { value: RegisteredModelStatus; label: string }[] = [
  { value: 'ok', label: 'OK' },
  { value: 'untested', label: 'Untested' },
  { value: 'failed', label: 'Failed' },
];

export function CredentialDetailView({ credentialId }: { credentialId: string }) {
  const credential = useCredential(credentialId);
  const schemas = useProviderSchemas();
  const models = useRegisteredModels(credentialId);
  const testConnection = useTestCredential();
  const testModel = useTestRegisteredModel(credentialId);
  const removeModel = useRemoveRegisteredModel(credentialId);
  const sync = useSyncModels(credentialId);
  const [testOnSync, setTestOnSync] = useState(false);
  const [toRemove, setToRemove] = useState<RegisteredModel | null>(null);
  const [query, setQuery] = useGridQuery({ storageKey: 'registered-models', sort: [{ field: 'name', dir: 'asc' }] });

  const provider = credential.data?.provider;
  const isOllama = provider === 'ollama';
  const supportsModels = schemas.data?.find((s) => s.provider === provider)?.config_page ?? true;

  const columns = useMemo<GridColumn<RegisteredModel>[]>(
    () => [
      {
        id: 'name',
        header: 'Model',
        width: 300,
        accessor: (m) => m.name,
        filter: { type: 'text' },
        cell: (m) => (
          <div className="min-w-0">
            <p className="truncate font-mono text-[13px] font-medium">{m.name}</p>
            {m.base_model && <p className="truncate text-xs text-muted-foreground">based on {m.base_model}</p>}
          </div>
        ),
      },
      {
        id: 'capabilities',
        header: 'Can do',
        width: 220,
        accessor: (m) => m.capabilities.join(' '),
        filter: { type: 'text' },
        cell: (m) =>
          m.capabilities.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {m.capabilities.map((c) => <Badge key={c} variant="outline" className="capitalize">{c}</Badge>)}
            </div>
          ),
      },
      {
        id: 'context_window',
        header: 'Context',
        width: 120,
        align: 'right',
        accessor: (m) => m.context_window,
        filter: { type: 'number' },
        cell: (m) => <span className="text-muted-foreground">{m.context_window ? formatNumber(m.context_window) : '—'}</span>,
      },
      {
        id: 'embedding_dim',
        header: 'Dims',
        width: 90,
        align: 'right',
        accessor: (m) => m.embedding_dim,
        filter: { type: 'number' },
        cell: (m) => <span className="text-muted-foreground">{m.embedding_dim ?? '—'}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        width: 280,
        wrap: true,
        accessor: (m) => m.status,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cell: (m) => (
          <div className="min-w-0">
            <StatusBadge status={m.status} />
            {m.last_error && <p className="mt-1 line-clamp-2 text-xs text-clay-fg" title={m.last_error}>{m.last_error}</p>}
            {m.last_checked_at && <p className="mt-1 text-xs text-muted-foreground">checked {formatRelative(m.last_checked_at)}</p>}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        hideHeader: true,
        width: 150,
        align: 'right',
        sortable: false,
        resizable: false,
        hideable: false,
        reorderable: false,
        searchable: false,
        cell: (m) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="xs" loading={testModel.isPending && testModel.variables === m.id} onClick={() => testModel.mutate(m.id)}>
              <PlugZap /> Test
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Remove ${m.name}`} onClick={() => setToRemove(m)}><Trash2 /></Button>
          </div>
        ),
      },
    ],
    [testModel],
  );

  const page = useLocalGrid(models.data, columns, query);

  return (
    <>
      <PageHeader
        eyebrow={
          <Link to="/app/credentials" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Credentials
          </Link>
        }
        title={credential.data?.name ?? 'Connection'}
        description={provider ? `${PROVIDER_LABEL[provider]} · register the models projects can choose from this connection.` : undefined}
        actions={
          <Button variant="outline" size="sm" loading={testConnection.isPending} disabled={!credential.data} onClick={() => testConnection.mutate(credentialId)}>
            <PlugZap /> Test connection
          </Button>
        }
      />

      {credential.isError ? (
        <Panel>
          <EmptyState icon={Boxes} title="Couldn’t load this connection" description={credential.error.message} />
        </Panel>
      ) : !supportsModels ? (
        <Panel>
          <EmptyState
            icon={Boxes}
            title="Nothing to configure here"
            description="This provider’s models come from a built-in catalog, so there’s nothing to register."
            action={<Button asChild variant="outline" size="sm"><Link to="/app/credentials">Back to credentials</Link></Button>}
          />
        </Panel>
      ) : (
        <DataGrid
          label="Registered models"
          storageKey="registered-models"
          title="Registered models"
          description={isOllama ? 'Models on your Ollama server.' : 'Your Azure deployments.'}
          actions={
            <>
              {isOllama && (
                <>
                  <label className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                    <Switch checked={testOnSync} onCheckedChange={setTestOnSync} aria-label="Also test each model while syncing" />
                    Also test (slow)
                  </label>
                  <Button variant="outline" size="sm" loading={sync.isPending} onClick={() => sync.mutate(testOnSync)}>
                    <RefreshCw /> Sync from server
                  </Button>
                </>
              )}
              {provider && <RegisterModelDialog credentialId={credentialId} provider={provider} />}
            </>
          }
          columns={columns}
          rows={page.rows}
          total={page.total}
          getRowId={(m) => m.id}
          query={query}
          onQueryChange={setQuery}
          loading={models.isPending || credential.isPending}
          fetching={models.isFetching}
          error={models.error?.message}
          onRetry={() => void models.refetch()}
          onRefresh={() => void models.refetch()}
          searchPlaceholder="Search models…"
          emptyState={
            <EmptyState
              icon={Boxes}
              title="No models registered"
              description={isOllama ? 'Sync to import the models downloaded on your server, or register one by name.' : 'Register a deployment so projects can use it.'}
            />
          }
        />
      )}

      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(o) => !o && setToRemove(null)}
        title="Remove this model?"
        description={<>“{toRemove?.name}” will no longer be offered to projects. The server refuses while a project still uses it.</>}
        confirmLabel="Remove"
        destructive
        pending={removeModel.isPending}
        onConfirm={() => removeModel.mutateAsync(toRemove!.id)}
      />
    </>
  );
}
