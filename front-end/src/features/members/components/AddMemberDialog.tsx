import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/shared/form-field';
import { useAddMember } from '../queries';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email')),
  role: z.enum(['worker', 'owner']),
});
type Values = z.infer<typeof schema>;

export function AddMemberDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const add = useAddMember(projectId);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', role: 'worker' } });

  const onSubmit = handleSubmit(async (values) => {
    await add.mutateAsync(values);
    setOpen(false);
    reset();
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button><UserPlus /> Add member</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add a member</DialogTitle>
            <DialogDescription>
              The person must already have an account. Admins can invite new people under Users.
            </DialogDescription>
          </DialogHeader>

          <FormField label="Email" htmlFor="member-email" error={errors.email?.message} required>
            <Input id="member-email" type="email" autoFocus placeholder="name@company.com" aria-invalid={!!errors.email} {...register('email')} />
          </FormField>

          <FormField
            label="Role"
            htmlFor="member-role"
            hint="Workers can upload documents and run processing. Owners can also edit the project, models and team."
          >
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="member-role" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">Worker</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={add.isPending}>Add member</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
