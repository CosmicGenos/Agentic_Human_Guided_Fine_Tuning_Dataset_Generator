import { useCallback, useMemo, useState } from 'react';
import { readGridPrefs, writeGridPrefs } from './grid-storage';
import type { GridColumn } from './types';

const DEFAULT_WIDTH = 160;
const FALLBACK_MIN = 60;

/**
 * Which columns are visible, in what order, how wide. Starts from the column
 * definitions, applies what the user changed, and remembers it per storageKey.
 */
export function useColumnLayout<T>(columns: GridColumn<T>[], storageKey?: string) {
  const [prefs, setPrefs] = useState(() => readGridPrefs(storageKey));

  const patch = useCallback(
    (next: Partial<typeof prefs>) => {
      setPrefs((p) => ({ ...p, ...next }));
      writeGridPrefs(storageKey, next);
    },
    [storageKey],
  );

  // stored order first (ignoring columns that no longer exist), new columns appended
  const ordered = useMemo(() => {
    const byId = new Map(columns.map((c) => [c.id, c]));
    const stored = (prefs.order ?? []).flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
    const seen = new Set(stored.map((c) => c.id));
    return [...stored, ...columns.filter((c) => !seen.has(c.id))];
  }, [columns, prefs.order]);

  const hidden = useMemo(
    () => new Set(prefs.hidden ?? columns.filter((c) => c.defaultHidden).map((c) => c.id)),
    [columns, prefs.hidden],
  );

  const visible = useMemo(() => ordered.filter((c) => !hidden.has(c.id)), [ordered, hidden]);

  const clampWidth = useCallback((col: GridColumn<T>, w: number) => {
    const min = col.minWidth ?? FALLBACK_MIN;
    const max = col.maxWidth ?? 1200;
    return Math.min(max, Math.max(min, Math.round(w)));
  }, []);

  /** True once the user has dragged this column's width; until then it stretches to share the free space. */
  const hasCustomWidth = useCallback((col: GridColumn<T>) => prefs.sizes?.[col.id] !== undefined, [prefs.sizes]);

  const widthOf = useCallback(
    (col: GridColumn<T>) => clampWidth(col, prefs.sizes?.[col.id] ?? col.width ?? DEFAULT_WIDTH),
    [clampWidth, prefs.sizes],
  );

  const setWidth = useCallback(
    (col: GridColumn<T>, w: number) => patch({ sizes: { ...prefs.sizes, [col.id]: clampWidth(col, w) } }),
    [clampWidth, patch, prefs.sizes],
  );

  const resetWidth = useCallback(
    (col: GridColumn<T>) => {
      const sizes = { ...prefs.sizes };
      delete sizes[col.id];
      patch({ sizes });
    },
    [patch, prefs.sizes],
  );

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(hidden);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      patch({ hidden: [...next] });
    },
    [hidden, patch],
  );

  const moveTo = useCallback(
    (id: string, targetId: string) => {
      if (id === targetId) return;
      const ids = ordered.map((c) => c.id);
      const from = ids.indexOf(id);
      const to = ids.indexOf(targetId);
      if (from < 0 || to < 0) return;
      ids.splice(to, 0, ids.splice(from, 1)[0]!);
      patch({ order: ids });
    },
    [ordered, patch],
  );

  const moveBy = useCallback(
    (id: string, delta: -1 | 1) => {
      const ids = ordered.map((c) => c.id);
      const from = ids.indexOf(id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= ids.length) return;
      ids.splice(to, 0, ids.splice(from, 1)[0]!);
      patch({ order: ids });
    },
    [ordered, patch],
  );

  const reset = useCallback(() => {
    setPrefs((p) => ({ pageSize: p.pageSize }));
    writeGridPrefs(storageKey, { order: undefined, hidden: undefined, sizes: undefined });
  }, [storageKey]);

  const isCustomised = !!(prefs.order || prefs.hidden || (prefs.sizes && Object.keys(prefs.sizes).length));

  return { ordered, visible, hidden, widthOf, hasCustomWidth, setWidth, resetWidth, toggle, moveTo, moveBy, reset, isCustomised };
}
