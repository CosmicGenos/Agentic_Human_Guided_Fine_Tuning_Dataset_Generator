import type { ReactNode } from 'react';

/* ───────────────────────────── query model ─────────────────────────────
 * One description of "which rows do I want", shared by every grid.
 * The grid never slices data itself: it edits a GridQuery and shows whatever
 * rows + total it is given. Today the API returns whole lists, so screens run
 * the query in the browser (see local-data-source.ts); when an endpoint learns
 * to paginate, it receives serializeGridQuery(query) and nothing else changes.
 */

export type SortDirection = 'asc' | 'desc';

export interface SortModel {
  /** A column id. This is also the field name sent to the server. */
  field: string;
  dir: SortDirection;
}

/** One condition per column. Values are strings (they come from inputs); the column's filter type says how to read them. */
export type FilterCondition =
  | { field: string; op: 'contains'; value: string }
  | { field: string; op: 'in'; value: string[] }
  | { field: string; op: 'gte' | 'lte'; value: string }
  | { field: string; op: 'between'; value: [string, string] };

export interface GridQuery {
  /** 1-based. */
  page: number;
  pageSize: number;
  /** Applied in order: the first entry is the primary sort. */
  sort: SortModel[];
  /** All conditions must match (AND). */
  filters: FilterCondition[];
  /** Free-text search across the searchable columns. */
  search: string;
}

/* ───────────────────────────── columns ───────────────────────────── */

export type ColumnFilter =
  | { type: 'text' }
  | { type: 'select'; options: { label: string; value: string }[] }
  | { type: 'number' }
  | { type: 'date' };

export type CellValue = string | number | boolean | null | undefined;

/** Declares one column: what it shows and how it behaves. Define these once, outside the component or in useMemo. */
export interface GridColumn<T> {
  /** Stable id. Also the field name used in sort/filter (and the server contract). */
  id: string;
  header: string;
  /** Visually hide the header text (it stays available to screen readers), e.g. for an actions column. */
  hideHeader?: boolean;

  /** Raw value used for sorting, filtering and search when the query runs locally. Defaults to row[id]. */
  accessor?: (row: T) => CellValue;
  /** What to render. Defaults to the accessor value as text. */
  cell?: (row: T) => ReactNode;

  /** Initial width in px (default 160). */
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  /** Let long content wrap instead of truncating with an ellipsis. */
  wrap?: boolean;

  /** Default true. */
  sortable?: boolean;
  /** Default true. */
  resizable?: boolean;
  /** Can be hidden from the Columns menu. Default true. */
  hideable?: boolean;
  /** Can be dragged to a new position. Default true. */
  reorderable?: boolean;
  /** Included in free-text search. Default true. */
  searchable?: boolean;
  defaultHidden?: boolean;

  /** Adds a filter control to the header. */
  filter?: ColumnFilter;

  headerClassName?: string;
  cellClassName?: string;
}

/* ───────────────────────────── selection ─────────────────────────────
 * Selection can span pages. 'ids' lists the selected rows. 'all' means
 * "every row matching the current query" minus the ones you unticked; the
 * consumer then sends the query (not ids) to the server for bulk actions.
 */

export type SelectionMode = 'none' | 'single' | 'multiple';

export type SelectionState =
  | { mode: 'ids'; ids: ReadonlySet<string> }
  | { mode: 'all'; excludedIds: ReadonlySet<string> };

export const EMPTY_SELECTION: SelectionState = { mode: 'ids', ids: new Set() };

export function isSelected(sel: SelectionState, id: string): boolean {
  return sel.mode === 'ids' ? sel.ids.has(id) : !sel.excludedIds.has(id);
}

export function selectedCount(sel: SelectionState, total: number): number {
  return sel.mode === 'ids' ? sel.ids.size : Math.max(0, total - sel.excludedIds.size);
}

/** Selected ids when the selection is an explicit list; null for "all matching" (use the query instead). */
export function selectedIds(sel: SelectionState): string[] | null {
  return sel.mode === 'ids' ? [...sel.ids] : null;
}
