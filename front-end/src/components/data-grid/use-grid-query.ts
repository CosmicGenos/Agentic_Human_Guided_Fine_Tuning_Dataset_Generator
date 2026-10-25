import { useCallback, useState } from 'react';
import { createQuery } from './query';
import { readGridPrefs, writeGridPrefs } from './grid-storage';
import type { GridQuery, SortModel } from './types';

interface UseGridQueryOptions {
  /** Same key you give <DataGrid storageKey>: the chosen page size is remembered. */
  storageKey?: string;
  pageSize?: number;
  sort?: SortModel[];
}

/** Owns a grid's query state. Pass the result straight to <DataGrid query onQueryChange>. */
export function useGridQuery(options: UseGridQueryOptions = {}) {
  const { storageKey } = options;
  const [query, setQueryState] = useState<GridQuery>(() =>
    createQuery({
      // a stored value that isn't a sane page size is ignored by createQuery
      pageSize: readGridPrefs(storageKey).pageSize ?? options.pageSize,
      sort: options.sort,
    }),
  );

  const setQuery = useCallback(
    (next: GridQuery) => {
      setQueryState((prev) => {
        if (next.pageSize !== prev.pageSize) writeGridPrefs(storageKey, { pageSize: next.pageSize });
        return next;
      });
    },
    [storageKey],
  );

  return [query, setQuery] as const;
}
