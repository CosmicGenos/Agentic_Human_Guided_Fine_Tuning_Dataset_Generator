import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { FormField } from '@/components/shared/form-field';
import { useAuth } from '../use-auth';
import { useLoginMutation } from '../queries';
import { loginSchema } from '../schemas';
import type { LoginValues } from '../schemas';
import { darkButton, darkField, darkLabel } from './AuthShell';

/** Only allow redirects back into the app, never to another site. */
function safeRedirect(from: unknown): string {
  return typeof from === 'string' && from.startsWith('/app') ? from : '/app';
}

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mutation = useLoginMutation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { access_token } = await mutation.mutateAsync(values);
      if (!login(access_token)) {
        setFormError('The server returned an unusable session. Please try again.');
        return;
      }
      navigate(safeRedirect((location.state as { from?: string } | null)?.from), { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not sign in.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && (
        <div role="alert" className="rounded-lg border border-[#b43232]/30 bg-[#781414]/25 px-3 py-2.5 text-xs text-[#e6a1a1]">
          {formError}
        </div>
      )}

      <FormField label="Email" htmlFor="email" error={errors.email?.message} labelClassName={darkLabel}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="you@company.com"
          aria-invalid={!!errors.email}
          className={darkField}
          {...register('email')}
        />
      </FormField>

      <FormField label="Password" htmlFor="password" error={errors.password?.message} labelClassName={darkLabel}>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={!!errors.password}
          className={darkField}
          {...register('password')}
        />
      </FormField>

      <Button type="submit" size="lg" loading={mutation.isPending} className={`${darkButton} mt-1`}>
        {mutation.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
