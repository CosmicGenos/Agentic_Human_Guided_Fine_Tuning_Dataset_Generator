import { useMemo, useState } from 'react';
import { Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataGrid, useGridQuery, useLocalGrid } from '@/components/data-grid';
import type { GridColumn } from '@/components/data-grid';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { useAuth } from '@/features/auth/use-auth';
import { formatDate } from '@/lib/format';
import { useMembers, useRemoveMember, useUpdateMemberRole } from '../queries';
import { useProjectAccess } from '../use-project-access';
import type { Member, ProjectRole } from '../types';
import { AddMemberDialog } from './AddMemberDialog';

const ROLE_OPTIONS = [{ value: 'owner', label: 'Owner' }, { value: 'worker', label: 'Worker' }];

export function MembersView({ projectId }: { projectId: string }) {
  const { user: me } = useAuth();
  const members = useMembers(projectId);
  const { isOwner } = useProjectAccess(projectId);
  const updateRole = useUpdateMemberRole(projectId);
  const remove = useRemoveMember(projectId);
  const [toRemove, setToRemove] = useState<Member | null>(null);
  const [query, setQuery] = useGridQuery({ storageKey: 'members' });

  const columns = useMemo<GridColumn<Member>[]>(
    () => [
      {
        id: 'username',
        header: 'Member',
        width: 260,
        accessor: (m) => m.username ?? m.email,
        filter: { type: 'text' },
        cell: (m) => (
          <span className="font-medium">
            {m.username ?? m.email}
            {m.user_id === me?.id && <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>}
          </span>
        ),
      },
      { id: 'email', header: 'Email', width: 280, accessor: (m) => m.email, filter: { type: 'text' } },
      {
        id: 'role',
        header: 'Role',
        width: 150,
        accessor: (m) => m.role,
        filter: { type: 'select', options: ROLE_OPTIONS },
        cell: (m) =>
          isOwner ? (
            <Select value={m.role} onValueChange={(role) => updateRole.mutate({ userId: m.user_id, role: role as ProjectRole })}>
              <SelectTrigger size="sm" className="w-28" aria-label={`Role of ${m.email}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="worker">Worker</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant={m.role === 'owner' ? 'default' : 'neutral'} className="capitalize">{m.role}</Badge>
          ),
      },
      {
        id: 'added_at',
        header: 'Added',
        width: 140,
        accessor: (m) => m.added_at,
        filter: { type: 'date' },
        cell: (m) => <span className="text-muted-foreground">{formatDate(m.added_at)}</span>,
      },
      ...(isOwner
        ? [{
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
            cell: (m: Member) => (
              <Button variant="ghost" size="icon-sm" aria-label={`Remove ${m.email}`} onClick={() => setToRemove(m)}><Trash2 /></Button>
            ),
          } satisfies GridColumn<Member>]
        : []),
    ],
    [isOwner, me?.id, updateRole],
  );

  const page = useLocalGrid(members.data, columns, query);

  return (
    <>
      <DataGrid
        label="Project members"
        storageKey="members"
        title="Team"
        description={isOwner ? 'Owners manage the project; workers upload and process documents.' : 'Only owners can change the team.'}
        actions={isOwner ? <AddMemberDialog projectId={projectId} /> : undefined}
        columns={columns}
        rows={page.rows}
        total={page.total}
        getRowId={(m) => m.user_id}
        query={query}
        onQueryChange={setQuery}
        loading={members.isPending}
        fetching={members.isFetching}
        error={members.error?.message}
        onRetry={() => void members.refetch()}
        searchPlaceholder="Search members…"
        emptyState={<EmptyState icon={Users} title="No members" />}
      />

      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(o) => !o && setToRemove(null)}
        title="Remove this member?"
        description={<>{toRemove?.email} will lose access to this project. A project always keeps at least one owner.</>}
        confirmLabel="Remove"
        destructive
        pending={remove.isPending}
        onConfirm={() => remove.mutateAsync(toRemove!.user_id)}
      />
    </>
  );
}
