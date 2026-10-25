import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FormField } from '@/components/shared/form-field';
import { Panel } from '@/components/layout/Panel';
import { useDocuments } from '@/features/documents/queries';
import { useJobs } from '@/features/processing/queries';
import { isJobActive } from '@/features/processing/types';
import { useMembers } from '@/features/members/queries';
import { useProjectAccess } from '@/features/members/use-project-access';
import { formatDate } from '@/lib/format';
import { useDeleteProject, useProject, useUpdateProject } from '../queries';
import { projectSchema } from '../schemas';
import type { ProjectValues } from '../schemas';
import type { Project } from '../types';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-serif text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function ProjectOverview({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const documents = useDocuments(projectId);
  const jobs = useJobs(projectId);
  const members = useMembers(projectId);

  const docs = documents.data;
  const stat = (n: number | undefined) => (n === undefined ? '—' : n);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:gap-5">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Documents" value={stat(docs?.length)} />
          <Stat label="Processed" value={stat(docs?.filter((d) => d.status === 'completed').length)} />
          <Stat label="Failed" value={stat(docs?.filter((d) => d.status === 'failed').length)} />
          <Stat label="Running jobs" value={stat(jobs.data?.filter((j) => isJobActive(j.status)).length)} />
        </div>

        {project.data && <DetailsForm key={project.data.updated_at} project={project.data} hasDocuments={(docs?.length ?? 0) > 0} />}
      </div>

      <div className="space-y-4">
        <Panel title="About">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(project.data?.created_at)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Last changed</dt>
              <dd>{formatDate(project.data?.updated_at)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Team</dt>
              <dd>{members.data ? `${members.data.length} member${members.data.length === 1 ? '' : 's'}` : '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Embedder</dt>
              <dd>{project.data?.embedding_locked ? 'Locked' : 'Not locked yet'}</dd>
            </div>
          </dl>
        </Panel>

        <DangerZone projectId={projectId} title={project.data?.title ?? ''} />
      </div>
    </div>
  );
}

function DetailsForm({ project, hasDocuments }: { project: Project; hasDocuments: boolean }) {
  const { isOwner } = useProjectAccess(project.id);
  const update = useUpdateProject(project.id);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { title: project.title, description: project.description, data_type: project.data_type },
  });

  const onSubmit = handleSubmit((values) =>
    update.mutate(
      { title: values.title, description: values.description, ...(values.data_type !== project.data_type ? { data_type: values.data_type } : {}) },
      { onSuccess: (saved) => reset({ title: saved.title, description: saved.description, data_type: saved.data_type }) },
    ),
  );

  return (
    <Panel title="Details" description={isOwner ? undefined : 'Only owners can edit the project.'}>
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <FormField label="Title" htmlFor="p-title" error={errors.title?.message}>
          <Input id="p-title" disabled={!isOwner} aria-invalid={!!errors.title} {...register('title')} />
        </FormField>
        <FormField label="Description" htmlFor="p-desc" error={errors.description?.message}>
          <Textarea id="p-desc" disabled={!isOwner} {...register('description')} />
        </FormField>
        <FormField
          label="Type of material"
          htmlFor="p-type"
          hint={hasDocuments ? 'Locked: documents have already been uploaded.' : 'Decides how documents are processed.'}
        >
          <Controller
            control={control}
            name="data_type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={!isOwner || hasDocuments}>
                <SelectTrigger id="p-type" className="w-full sm:w-72"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiction">Fiction</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        {isOwner && (
          <div className="flex gap-2">
            <Button type="submit" disabled={!isDirty} loading={update.isPending}>Save changes</Button>
            {isDirty && <Button type="button" variant="ghost" onClick={() => reset()}>Discard</Button>}
          </div>
        )}
      </form>
    </Panel>
  );
}

function DangerZone({ projectId, title }: { projectId: string; title: string }) {
  const navigate = useNavigate();
  const { isOwner } = useProjectAccess(projectId);
  const remove = useDeleteProject();
  const [open, setOpen] = useState(false);

  if (!isOwner) return null;
  return (
    <>
      <Panel title="Delete project" className="border-clay/30">
        <p className="text-sm text-muted-foreground">
          Permanently removes the project with its documents, extracted text, vectors, models and team. This can’t be undone.
        </p>
        <Button variant="destructive" size="sm" className="mt-4" onClick={() => setOpen(true)}>Delete project</Button>
      </Panel>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete “${title}”?`}
        description="Everything in this project is removed for everyone on the team."
        confirmLabel="Delete forever"
        destructive
        pending={remove.isPending}
        onConfirm={async () => {
          await remove.mutateAsync(projectId);
          navigate('/app/projects', { replace: true });
        }}
      />
    </>
  );
}
