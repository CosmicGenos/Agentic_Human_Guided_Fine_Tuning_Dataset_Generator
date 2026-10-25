import { useMemo } from 'react';
import { isSelected } from './types';
import type { CellValue, FilterCondition, GridColumn, GridQuery, SelectionState } from './types';

/**
 * Runs a GridQuery in the browser. This is the stand-in for a server that doesn't
 * paginate yet: same input (GridQuery), same output (rows for this page + total).
 */

export function valueOf<T>(col: GridColumn<T>, row: T): CellValue {
  if (col.accessor) return col.accessor(row);
  return (row as Record<string, CellValue>)[col.id];
}

const text = (v: CellValue) => (v === null || v === undefined ? '' : String(v));

function toNumber(v: CellValue): number {
  return typeof v === 'number' ? v : Number(v);
}

function matches<T>(col: GridColumn<T>, row: T, c: FilterCondition): boolean {
  const v = valueOf(col, row);
  const isDate = col.filter?.type === 'date';
  const isNumeric = col.filter?.type === 'number';

  // compare as numbers, dates (ISO strings sort correctly as text) or plain text
  const cmp = (a: CellValue, b: string): number => {
    if (isNumeric) return toNumber(a) - Number(b);
    if (isDate) return text(a).slice(0, 10).localeCompare(b.slice(0, 10));
    return text(a).localeCompare(b);
  };
  if (v === null || v === undefined || v === '') return false;

  switch (c.op) {
    case 'contains': return text(v).toLowerCase().includes(c.value.toLowerCase());
    case 'in': return c.value.includes(text(v));
    case 'gte': return cmp(v, c.value) >= 0;
    case 'lte': return cmp(v, c.value) <= 0;
    case 'between': return cmp(v, c.value[0]) >= 0 && cmp(v, c.value[1]) <= 0;
  }
}

const isEmpty = (v: CellValue) => v === null || v === undefined || v === '';

/** Orders two non-empty values. */
function compare(a: CellValue, b: CellValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return text(a).localeCompare(text(b), undefined, { numeric: true, sensitivity: 'base' });
}

export interface LocalPage<T> {
  /** Rows for the requested page. */
  rows: T[];
  /** Rows matching search + filters, across all pages. */
  total: number;
  /** All matching rows (unpaged): resolve an 'all matching' selection with this. */
  matching: T[];
}

export function applyGridQuery<T>(all: readonly T[], columns: GridColumn<T>[], query: GridQuery): LocalPage<T> {
  const byId = new Map(columns.map((c) => [c.id, c]));
  let rows = [...all];

  const needle = query.search.trim().toLowerCase();
  if (needle) {
    const searchable = columns.filter((c) => c.searchable !== false);
    rows = rows.filter((r) => searchable.some((c) => text(valueOf(c, r)).toLowerCase().includes(needle)));
  }

  for (const f of query.filters) {
    const col = byId.get(f.field);
    if (col) rows = rows.filter((r) => matches(col, r, f));
  }

  const sorts = query.sort.flatMap((s) => {
    const col = byId.get(s.field);
    return col ? [{ col, sign: s.dir === 'asc' ? 1 : -1 }] : [];
  });
  if (sorts.length) {
    rows.sort((a, b) => {
      for (const { col, sign } of sorts) {
        const av = valueOf(col, a);
        const bv = valueOf(col, b);
        // empty values go last in BOTH directions (the sign must not flip them to the top)
        if (isEmpty(av) || isEmpty(bv)) {
          if (isEmpty(av) !== isEmpty(bv)) return isEmpty(av) ? 1 : -1;
          continue;
        }
        const d = compare(av, bv);
        if (d !== 0) return d * sign;
      }
      return 0;
    });
  }

  const start = (Math.max(1, query.page) - 1) * query.pageSize;
  return { rows: rows.slice(start, start + query.pageSize), total: rows.length, matching: rows };
}

/**
 * The rows behind a selection. An 'all matching' selection resolves against `matching`
 * (from useLocalGrid); against a real server you'd send the query instead.
 */
export function resolveSelection<T>(sel: SelectionState, matching: readonly T[], getRowId: (row: T) => string): T[] {
  return matching.filter((r) => isSelected(sel, getRowId(r)));
}

/** Hook form: recomputes only when the data, columns or query change. */
export function useLocalGrid<T>(all: readonly T[] | undefined, columns: GridColumn<T>[], query: GridQuery): LocalPage<T> {
  return useMemo(() => applyGridQuery(all ?? [], columns, query), [all, columns, query]);
}
