import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { FormField } from '@/components/shared/form-field';
import { useSetupAccountMutation } from '../queries';
import { setupSchema } from '../schemas';
import type { SetupValues } from '../schemas';
import { darkButton, darkField, darkLabel } from './AuthShell';

export function SetupPasswordForm({ token }: { token: string }) {
  const navigate = useNavigate();
  const mutation = useSetupAccountMutation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { username: '', password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ username, password }) => {
    setFormError(null);
    try {
      await mutation.mutateAsync({ token, username, password });
      toast.success('Account ready. Sign in with your email and new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not finish setup.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && (
        <div role="alert" className="rounded-lg border border-[#b43232]/30 bg-[#781414]/25 px-3 py-2.5 text-xs text-[#e6a1a1]">
          {formError}{' '}
          <Link to="/login" className="underline">Back to sign in</Link>
        </div>
      )}

      <FormField label="Username" htmlFor="username" error={errors.username?.message} labelClassName={darkLabel}>
        <Input
          id="username"
          autoComplete="username"
          autoFocus
          aria-invalid={!!errors.username}
          className={darkField}
          {...register('username')}
        />
      </FormField>

      <FormField
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
        hint="8+ characters with upper, lower, number and symbol."
        labelClassName={darkLabel}
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          className={darkField}
          {...register('password')}
        />
      </FormField>

      <FormField label="Confirm password" htmlFor="confirm" error={errors.confirm?.message} labelClassName={darkLabel}>
        <PasswordInput
          id="confirm"
          autoComplete="new-password"
          aria-invalid={!!errors.confirm}
          className={darkField}
          {...register('confirm')}
        />
      </FormField>

      <Button type="submit" size="lg" loading={mutation.isPending} className={`${darkButton} mt-1`}>
        Set password
      </Button>
    </form>
  );
}
