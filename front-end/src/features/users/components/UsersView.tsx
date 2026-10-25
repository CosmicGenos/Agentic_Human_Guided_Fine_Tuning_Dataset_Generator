import { useMemo, useState } from 'react';
import { MailPlus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DataGrid, useGridQuery, useLocalGrid } from '@/components/data-grid';
import type { GridColumn } from '@/components/data-grid';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/features/auth/use-auth';
import type { User } from '@/features/auth/types';
import { formatDate } from '@/lib/format';
import { useResendInvite, useSetUserActive, useUsers } from '../queries';
import { InviteUserDialog } from './InviteUserDialog';

type UserState = 'active' | 'invited' | 'deactivated';
const stateOf = (u: User): UserState => (!u.is_active ? 'deactivated' : u.must_change_password ? 'invited' : 'active');

const STATE_BADGE: Record<UserState, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  invited: { variant: 'warning', label: 'Invited' },
  deactivated: { variant: 'danger', label: 'Deactivated' },
};

export function UsersView() {
  const { user: me } = useAuth();
  const users = useUsers();
  const setActive = useSetUserActive();
  const resend = useResendInvite();
  const [toDeactivate, setToDeactivate] = useState<User | null>(null);
  const [query, setQuery] = useGridQuery({ storageKey: 'users', sort: [{ field: 'created_at', dir: 'desc' }] });

  const columns = useMemo<GridColumn<User>[]>(
    () => [
      {
        id: 'username',
        header: 'Username',
        width: 220,
        accessor: (u) => u.username,
        filter: { type: 'text' },
        cell: (u) => (u.username ? <span className="font-medium">{u.username}</span> : <span className="text-muted-foreground">Not set up yet</span>),
      },
      { id: 'email', header: 'Email', width: 280, accessor: (u) => u.email, filter: { type: 'text' } },
      {
        id: 'app_role',
        header: 'Role',
        width: 120,
        accessor: (u) => u.app_role,
        filter: { type: 'select', options: [{ value: 'admin', label: 'Admin' }, { value: 'user', label: 'User' }] },
        cell: (u) => <Badge variant={u.app_role === 'admin' ? 'default' : 'neutral'} className="capitalize">{u.app_role}</Badge>,
      },
      {
        id: 'status',
        header: 'Status',
        width: 140,
        accessor: stateOf,
        filter: { type: 'select', options: (Object.keys(STATE_BADGE) as UserState[]).map((v) => ({ value: v, label: STATE_BADGE[v].label })) },
        cell: (u) => {
          const s = STATE_BADGE[stateOf(u)];
          return <Badge variant={s.variant}>{s.label}</Badge>;
        },
      },
      {
        id: 'created_at',
        header: 'Added',
        width: 140,
        accessor: (u) => u.created_at,
        filter: { type: 'date' },
        cell: (u) => <span className="text-muted-foreground">{formatDate(u.created_at)}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        hideHeader: true,
        width: 210,
        align: 'right',
        sortable: false,
        resizable: false,
        hideable: false,
        reorderable: false,
        searchable: false,
        cell: (u) => (
          <div className="flex items-center justify-end gap-2">
            {u.must_change_password && u.is_active && (
              <Button variant="ghost" size="xs" loading={resend.isPending && resend.variables === u.email} onClick={() => resend.mutate(u.email)}>
                <MailPlus /> Resend invite
              </Button>
            )}
            <Switch
              checked={u.is_active}
              disabled={u.id === me?.id || setActive.isPending}
              aria-label={u.is_active ? `Deactivate ${u.email}` : `Reactivate ${u.email}`}
              title={u.id === me?.id ? 'You cannot deactivate yourself' : u.is_active ? 'Active: switch off to deactivate' : 'Deactivated: switch on to reactivate'}
              onCheckedChange={(on) => (on ? setActive.mutate({ userId: u.id, isActive: true }) : setToDeactivate(u))}
            />
          </div>
        ),
      },
    ],
    [me?.id, resend, setActive],
  );

  const page = useLocalGrid(users.data, columns, query);

  return (
    <>
      <PageHeader
        title="Users"
        description="Invite people and control who can sign in. Project access is managed inside each project."
        actions={<InviteUserDialog />}
      />

      <DataGrid
        label="Users"
        storageKey="users"
        columns={columns}
        rows={page.rows}
        total={page.total}
        getRowId={(u) => u.id}
        query={query}
        onQueryChange={setQuery}
        loading={users.isPending}
        fetching={users.isFetching}
        error={users.error?.message}
        onRetry={() => void users.refetch()}
        onRefresh={() => void users.refetch()}
        searchPlaceholder="Search users…"
        emptyState={<EmptyState icon={Users} title="No users yet" description="Invite your first teammate to get started." />}
      />

      <ConfirmDialog
        open={!!toDeactivate}
        onOpenChange={(o) => !o && setToDeactivate(null)}
        title="Deactivate this user?"
        description={<>{toDeactivate?.email} will be signed out immediately and won’t be able to sign in until you reactivate them.</>}
        confirmLabel="Deactivate"
        destructive
        pending={setActive.isPending}
        onConfirm={() => setActive.mutateAsync({ userId: toDeactivate!.id, isActive: false })}
      />
    </>
  );
}
