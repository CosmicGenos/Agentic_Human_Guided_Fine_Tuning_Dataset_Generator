import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from './api-error';

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError;
    mutationMeta: {
      /** Skip the automatic error toast (the caller shows the error inline). */
      silent?: boolean;
    };
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Don't retry things that will fail the same way again (4xx), but ride out blips.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.meta?.silent) return;
      toast.error(error.message);
    },
  }),
});
