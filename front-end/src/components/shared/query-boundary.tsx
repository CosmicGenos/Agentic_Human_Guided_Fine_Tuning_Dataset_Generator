import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ApiError } from '@/lib/api-error';

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T, ApiError>;
  children: (data: T) => ReactNode;
  /** Shown while the first load is in flight. Defaults to a few skeleton rows. */
  loading?: ReactNode;
  /** When this returns true, `empty` is shown instead of children. */
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
}

function DefaultLoading() {
  return (
    <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-4/5" />
    </div>
  );
}

/**
 * Renders the loading / error / empty / data states of a query in one place,
 * so every screen handles them the same way.
 */
export function QueryBoundary<T>({ query, children, loading, isEmpty, empty }: QueryBoundaryProps<T>) {
  if (query.isPending) return <>{loading ?? <DefaultLoading />}</>;

  if (query.isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-clay/15 text-clay-fg">
          <AlertCircle className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium">Couldn’t load this</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{query.error.message}</p>
        </div>
        <Button variant="outline" size="sm" loading={query.isFetching} onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (isEmpty?.(query.data)) return <>{empty}</>;
  return <>{children(query.data)}</>;
}
