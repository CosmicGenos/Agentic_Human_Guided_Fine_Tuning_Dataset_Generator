import { describe, expect, it } from 'vitest';
import { applyGridQuery, resolveSelection } from './local-data-source';
import { createQuery, serializeGridQuery, withFilter } from './query';
import { isSelected, selectedCount } from './types';
import type { GridColumn } from './types';

interface Row { id: string; name: string; status: string; size: number; at: string | null }

const rows: Row[] = [
  { id: '1', name: 'Dune', status: 'completed', size: 900, at: '2026-10-20T10:00:00Z' },
  { id: '2', name: 'dune messiah', status: 'failed', size: 120, at: '2026-10-22T10:00:00Z' },
  { id: '3', name: 'Emma', status: 'completed', size: 40, at: null },
  { id: '4', name: 'Persuasion', status: 'queued', size: 5000, at: '2026-10-25T10:00:00Z' },
  { id: '5', name: 'Item 10', status: 'completed', size: 10, at: '2026-10-01T10:00:00Z' },
  { id: '6', name: 'Item 2', status: 'completed', size: 2, at: '2026-10-02T10:00:00Z' },
];

const cols: GridColumn<Row>[] = [
  { id: 'name', header: 'Name', filter: { type: 'text' } },
  { id: 'status', header: 'Status', filter: { type: 'select', options: [] } },
  { id: 'size', header: 'Size', filter: { type: 'number' } },
  { id: 'at', header: 'At', filter: { type: 'date' } },
];

const q = (p = {}) => createQuery({ pageSize: 10, ...p });
const ids = (r: { rows: Row[] }) => r.rows.map((x) => x.id);

describe('createQuery', () => {
  it('treats undefined values as "use the default" (regression: page size became NaN and no rows showed)', () => {
    const query = createQuery({ pageSize: undefined, sort: undefined, search: undefined });
    expect(query).toEqual({ page: 1, pageSize: 25, sort: [], filters: [], search: '' });

    // the same shape useGridQuery builds when nothing is stored and no size is given
    const result = applyGridQuery(rows, cols, query);
    expect(result.rows).toHaveLength(6);
    expect(result.total).toBe(6);
  });

  it('replaces unusable page numbers and sizes', () => {
    expect(createQuery({ pageSize: Number.NaN }).pageSize).toBe(25);
    expect(createQuery({ pageSize: 0 }).pageSize).toBe(25);
    expect(createQuery({ pageSize: -5 }).pageSize).toBe(25);
    expect(createQuery({ page: 0 }).page).toBe(1);
    expect(createQuery({ pageSize: 50, page: 3 })).toMatchObject({ pageSize: 50, page: 3 });
  });
});

describe('search and filters (local executor)', () => {
  it('searches case-insensitively across columns', () => {
    expect(ids(applyGridQuery(rows, cols, q({ search: 'DUNE' })))).toEqual(['1', '2']);
  });

  it('filters by text and by a set of values', () => {
    const text = withFilter(q(), 'name', { field: 'name', op: 'contains', value: 'item' });
    expect(applyGridQuery(rows, cols, text).total).toBe(2);

    const set = withFilter(q(), 'status', { field: 'status', op: 'in', value: ['failed', 'queued'] });
    expect(ids(applyGridQuery(rows, cols, set))).toEqual(['2', '4']);
  });

  it('compares numbers as numbers, inclusive on both ends', () => {
    // as text '10' < '9'; as numbers 9 <= 10 <= 900
    const between = withFilter(q(), 'size', { field: 'size', op: 'between', value: ['9', '900'] });
    expect(ids(applyGridQuery(rows, cols, between)).sort()).toEqual(['1', '2', '3', '5']);

    const gte = withFilter(q(), 'size', { field: 'size', op: 'gte', value: '900' });
    expect(ids(applyGridQuery(rows, cols, gte)).sort()).toEqual(['1', '4']);
  });

  it('filters date ranges and never matches rows with no date', () => {
    const range = withFilter(q(), 'at', { field: 'at', op: 'between', value: ['2026-10-20', '2026-10-22'] });
    expect(ids(applyGridQuery(rows, cols, range)).sort()).toEqual(['1', '2']);
  });

  it('replaces the previous condition for the same column and resets to page 1', () => {
    const first = withFilter(q({ page: 4 }), 'name', { field: 'name', op: 'contains', value: 'a' });
    const second = withFilter(first, 'name', { field: 'name', op: 'contains', value: 'b' });
    expect(second.filters).toHaveLength(1);
    expect(second.page).toBe(1);
    expect(withFilter(second, 'name', null).filters).toHaveLength(0);
  });
});

describe('sorting', () => {
  it('sorts numbers numerically', () => {
    const sorted = applyGridQuery(rows, cols, q({ sort: [{ field: 'size', dir: 'desc' }] }));
    expect(sorted.rows.map((r) => r.size)).toEqual([5000, 900, 120, 40, 10, 2]);
  });

  it('sorts text naturally (Item 2 before Item 10)', () => {
    const sorted = applyGridQuery(rows, cols, q({ sort: [{ field: 'name', dir: 'asc' }] }));
    expect(sorted.rows.map((r) => r.name)).toEqual(['Dune', 'dune messiah', 'Emma', 'Item 2', 'Item 10', 'Persuasion']);
  });

  it('keeps empty values last in both directions', () => {
    for (const dir of ['asc', 'desc'] as const) {
      const sorted = applyGridQuery(rows, cols, q({ sort: [{ field: 'at', dir }] }));
      expect(sorted.rows.at(-1)?.id).toBe('3');
    }
  });

  it('uses later sorts to break ties', () => {
    const sorted = applyGridQuery(rows, cols, q({ sort: [{ field: 'status', dir: 'asc' }, { field: 'size', dir: 'desc' }] }));
    expect(sorted.rows.map((r) => r.status)).toEqual(['completed', 'completed', 'completed', 'completed', 'failed', 'queued']);
    expect(sorted.rows.filter((r) => r.status === 'completed').map((r) => r.size)).toEqual([900, 40, 10, 2]);
  });
});

describe('paging', () => {
  it('counts every match in total and slices one page', () => {
    const page2 = applyGridQuery(rows, cols, q({ pageSize: 3, page: 2 }));
    expect(page2.total).toBe(6);
    expect(page2.rows).toHaveLength(3);
    expect(applyGridQuery(rows, cols, q({ pageSize: 3, page: 3 })).rows).toHaveLength(0);
  });
});

describe('selection across pages', () => {
  it('reads explicit ids and "all minus excluded"', () => {
    expect(isSelected({ mode: 'ids', ids: new Set(['1']) }, '1')).toBe(true);
    expect(isSelected({ mode: 'all', excludedIds: new Set(['1']) }, '1')).toBe(false);
    expect(isSelected({ mode: 'all', excludedIds: new Set(['1']) }, '2')).toBe(true);
    expect(selectedCount({ mode: 'all', excludedIds: new Set(['1', '2']) }, 6)).toBe(4);
  });

  it('resolves an "all matching" selection beyond the visible page', () => {
    const completed = withFilter(q({ pageSize: 2 }), 'status', { field: 'status', op: 'in', value: ['completed'] });
    const result = applyGridQuery(rows, cols, completed);
    expect(result.rows).toHaveLength(2); // only two on screen...
    expect(result.total).toBe(4); //        ...but four match
    const picked = resolveSelection({ mode: 'all', excludedIds: new Set(['1']) }, result.matching, (r) => r.id);
    expect(picked.map((r) => r.id)).toEqual(['3', '5', '6']);
  });
});

describe('serializeGridQuery (backend wire format)', () => {
  it('writes page, size, search, sort and an OData-style filter', () => {
    const wire = serializeGridQuery(
      createQuery({
        page: 2,
        pageSize: 50,
        search: ' dune ',
        sort: [{ field: 'at', dir: 'desc' }, { field: 'name', dir: 'asc' }],
        filters: [
          { field: 'name', op: 'contains', value: "o'brien" },
          { field: 'status', op: 'in', value: ['failed', 'queued'] },
          { field: 'size', op: 'between', value: ['10', '900'] },
          { field: 'at', op: 'gte', value: '2026-10-01' },
        ],
      }),
      cols,
    );
    expect(wire.get('page')).toBe('2');
    expect(wire.get('page_size')).toBe('50');
    expect(wire.get('q')).toBe('dune');
    expect(wire.get('sort')).toBe('at desc,name asc');
    // quotes are doubled; numbers stay unquoted because the size column is numeric
    expect(wire.get('filter')).toBe(
      "contains(name,'o''brien') and status in ('failed','queued') and size ge 10 and size le 900 and at ge '2026-10-01'",
    );
  });

  it('omits empty parts', () => {
    const wire = serializeGridQuery(createQuery(), cols);
    expect(wire.has('q')).toBe(false);
    expect(wire.has('sort')).toBe(false);
    expect(wire.has('filter')).toBe(false);
  });
});
