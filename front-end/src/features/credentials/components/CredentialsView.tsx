import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Pencil, PlugZap, Settings2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataGrid, useGridQuery, useLocalGrid } from '@/components/data-grid';
import type { GridColumn } from '@/components/data-grid';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatRelative } from '@/lib/format';
import { useCredentials, useDeleteCredential, useProviderSchemas, useTestCredential } from '../queries';
import { PROVIDER_LABEL } from '../types';
import type { Credential, Provider } from '../types';
import { CredentialFormDialog } from './CredentialFormDialog';

const PROVIDER_OPTIONS = (Object.keys(PROVIDER_LABEL) as Provider[]).map((v) => ({ value: v, label: PROVIDER_LABEL[v] }));

export function CredentialsView() {
  const credentials = useCredentials();
  const schemas = useProviderSchemas();
  const test = useTestCredential();
  const remove = useDeleteCredential();
  const [editing, setEditing] = useState<Credential | null>(null);
  const [toDelete, setToDelete] = useState<Credential | null>(null);
  const [query, setQuery] = useGridQuery({ storageKey: 'credentials', sort: [{ field: 'name', dir: 'asc' }] });

  const configPages = useMemo(
    () => new Set((schemas.data ?? []).filter((s) => s.config_page).map((s) => s.provider)),
    [schemas.data],
  );

  const columns = useMemo<GridColumn<Credential>[]>(
    () => [
      {
        id: 'name',
        header: 'Connection',
        width: 300,
        accessor: (c) => c.name,
        filter: { type: 'text' },
        cell: (c) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{c.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {c.secrets_present.length > 0 ? 'Key stored' : 'No key stored'}
              {Object.values(c.settings)[0] ? ` · ${Object.values(c.settings)[0]}` : ''}
            </p>
          </div>
        ),
      },
      {
        id: 'provider',
        header: 'Provider',
        width: 170,
        accessor: (c) => c.provider,
        filter: { type: 'select', options: PROVIDER_OPTIONS },
        cell: (c) => <Badge variant="outline">{PROVIDER_LABEL[c.provider]}</Badge>,
      },
      {
        id: 'used_by',
        header: 'Used by',
        width: 140,
        accessor: (c) => c.used_by_projects.length,
        filter: { type: 'number' },
        cell: (c) =>
          c.used_by_projects.length === 0 ? (
            <span className="text-muted-foreground">No projects</span>
          ) : (
            <span title={c.used_by_projects.map((p) => p.title).join(', ')}>
              {c.used_by_projects.length} project{c.used_by_projects.length === 1 ? '' : 's'}
            </span>
          ),
      },
      {
        id: 'updated_at',
        header: 'Updated',
        width: 150,
        accessor: (c) => c.updated_at,
        filter: { type: 'date' },
        cell: (c) => <span className="text-muted-foreground">{formatRelative(c.updated_at)}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        hideHeader: true,
        width: 280,
        align: 'right',
        sortable: false,
        resizable: false,
        hideable: false,
        reorderable: false,
        searchable: false,
        cell: (c) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="xs" loading={test.isPending && test.variables === c.id} onClick={() => test.mutate(c.id)}>
              <PlugZap /> Test
            </Button>
            {configPages.has(c.provider) && (
              <Button asChild variant="ghost" size="xs">
                <Link to={`/app/credentials/${c.id}`}><Settings2 /> Models</Link>
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}><Pencil /></Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Delete ${c.name}`} onClick={() => setToDelete(c)}><Trash2 /></Button>
          </div>
        ),
      },
    ],
    [configPages, test],
  );

  const page = useLocalGrid(credentials.data, columns, query);

  return (
    <>
      <PageHeader
        title="Credentials"
        description="Connections to AI providers. Add one once; any project owner can then choose it for their models."
        actions={<CredentialFormDialog />}
      />

      <DataGrid
        label="Credentials"
        storageKey="credentials"
        columns={columns}
        rows={page.rows}
        total={page.total}
        getRowId={(c) => c.id}
        query={query}
        onQueryChange={setQuery}
        loading={credentials.isPending}
        fetching={credentials.isFetching}
        error={credentials.error?.message}
        onRetry={() => void credentials.refetch()}
        onRefresh={() => void credentials.refetch()}
        searchPlaceholder="Search connections…"
        emptyState={
          <EmptyState
            icon={KeyRound}
            title="No connections yet"
            description="Add an API key (OpenAI, Anthropic, …) or point to your Ollama or Azure server."
            action={<CredentialFormDialog />}
          />
        }
      />

      {editing && <CredentialFormDialog credential={editing} open onOpenChange={(o) => !o && setEditing(null)} />}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this connection?"
        description={
          toDelete && toDelete.used_by_projects.length > 0 ? (
            <>It is still used by {toDelete.used_by_projects.map((p) => p.title).join(', ')}. Detach it from those projects first, or the server will refuse.</>
          ) : (
            <>“{toDelete?.name}” and its stored key will be permanently removed.</>
          )
        }
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
        onConfirm={() => remove.mutateAsync(toDelete!.id)}
      />
    </>
  );
}
