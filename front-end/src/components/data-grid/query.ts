import type { FilterCondition, GridColumn, GridQuery } from './types';

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function createQuery(partial: Partial<GridQuery> = {}): GridQuery {
  // `{ pageSize: undefined }` must mean "use the default", not "overwrite it with undefined"
  const given = Object.fromEntries(Object.entries(partial).filter(([, v]) => v !== undefined)) as Partial<GridQuery>;
  const query: GridQuery = { page: 1, pageSize: DEFAULT_PAGE_SIZE, sort: [], filters: [], search: '', ...given };
  if (!Number.isInteger(query.pageSize) || query.pageSize < 1) query.pageSize = DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(query.page) || query.page < 1) query.page = 1;
  return query;
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Replace (or remove, with null) the condition for one column. */
export function withFilter(query: GridQuery, field: string, condition: FilterCondition | null): GridQuery {
  const rest = query.filters.filter((f) => f.field !== field);
  return { ...query, page: 1, filters: condition ? [...rest, condition] : rest };
}

/** Short human text for a condition, used by the filter chips. */
export function describeFilter(c: FilterCondition, optionLabel?: (value: string) => string): string {
  switch (c.op) {
    case 'contains': return `contains “${c.value}”`;
    case 'in': return c.value.map((v) => optionLabel?.(v) ?? v).join(', ');
    case 'gte': return `≥ ${c.value}`;
    case 'lte': return `≤ ${c.value}`;
    case 'between': return `${c.value[0]} – ${c.value[1]}`;
  }
}

/* ───────────── wire format for the backend (proposed contract) ─────────────
 *   page=2&page_size=25
 *   q=dune
 *   sort=created_at desc,title asc
 *   filter=contains(title,'dune') and status in ('failed','queued') and size ge 100 and size le 900
 * OData-flavoured so it's familiar and easy to parse server-side. Numbers are unquoted
 * (decided by the column's filter type), everything else is a quoted string with '' escaping.
 */

const quote = (v: string) => `'${v.replace(/'/g, "''")}'`;

export function serializeGridQuery<T>(query: GridQuery, columns: GridColumn<T>[] = []): URLSearchParams {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('page_size', String(query.pageSize));
  if (query.search.trim()) params.set('q', query.search.trim());
  if (query.sort.length) params.set('sort', query.sort.map((s) => `${s.field} ${s.dir}`).join(','));

  const isNumber = (field: string) => columns.find((c) => c.id === field)?.filter?.type === 'number';
  const lit = (field: string, v: string) => (isNumber(field) ? v : quote(v));

  const parts = query.filters.flatMap((c) => {
    switch (c.op) {
      case 'contains': return [`contains(${c.field},${quote(c.value)})`];
      case 'in': return [`${c.field} in (${c.value.map(quote).join(',')})`];
      case 'gte': return [`${c.field} ge ${lit(c.field, c.value)}`];
      case 'lte': return [`${c.field} le ${lit(c.field, c.value)}`];
      case 'between': return [`${c.field} ge ${lit(c.field, c.value[0])}`, `${c.field} le ${lit(c.field, c.value[1])}`];
    }
  });
  if (parts.length) params.set('filter', parts.join(' and '));
  return params;
}
