import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/shared/form-field';
import { useCreateProject } from '../queries';
import { projectSchema } from '../schemas';
import type { ProjectValues } from '../schemas';

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const create = useCreateProject();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { title: '', description: '', data_type: 'fiction' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const project = await create.mutateAsync(values);
    setOpen(false);
    reset();
    navigate(`/app/projects/${project.id}`);
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus /> New project</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>You’ll be its owner and can invite teammates afterwards.</DialogDescription>
          </DialogHeader>

          <FormField label="Title" htmlFor="project-title" error={errors.title?.message} required>
            <Input id="project-title" autoFocus placeholder="Sherlock Holmes" aria-invalid={!!errors.title} {...register('title')} />
          </FormField>

          <FormField label="Description" htmlFor="project-description" error={errors.description?.message}>
            <Textarea id="project-description" placeholder="Optional" {...register('description')} />
          </FormField>

          <FormField
            label="Type of material"
            htmlFor="project-type"
            hint="Decides how documents are processed. It can’t be changed once documents are uploaded."
          >
            <Controller
              control={control}
              name="data_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="project-type" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fiction">Fiction: books and long-form prose</SelectItem>
                    <SelectItem value="academic">Academic: papers with figures and tables</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Create project</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
