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
import { useInviteUser } from '../queries';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email')),
  app_role: z.enum(['user', 'admin']),
});
type Values = z.infer<typeof schema>;

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const invite = useInviteUser();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', app_role: 'user' } });

  const onSubmit = handleSubmit(async (values) => {
    await invite.mutateAsync(values);
    setOpen(false);
    reset();
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button><UserPlus /> Invite user</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Invite a user</DialogTitle>
            <DialogDescription>
              They get an email with a one-time link (valid for 24 hours) to choose a username and password.
            </DialogDescription>
          </DialogHeader>

          <FormField label="Email" htmlFor="invite-email" error={errors.email?.message} required>
            <Input id="invite-email" type="email" autoFocus placeholder="name@company.com" aria-invalid={!!errors.email} {...register('email')} />
          </FormField>

          <FormField label="Role" htmlFor="invite-role" hint="Admins manage users and credentials, and can see every project.">
            <Controller
              control={control}
              name="app_role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="invite-role" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={invite.isPending}>Send invitation</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
