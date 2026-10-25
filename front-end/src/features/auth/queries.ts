import { useMutation } from '@tanstack/react-query';
import { authApi } from './api';
import type { SetupAccountInput } from './api';

// Both forms show their error inline, so skip the global toast.
export function useLoginMutation() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authApi.login(email, password),
    meta: { silent: true },
  });
}

export function useSetupAccountMutation() {
  return useMutation({
    mutationFn: (input: SetupAccountInput) => authApi.setupAccount(input),
    meta: { silent: true },
  });
}
