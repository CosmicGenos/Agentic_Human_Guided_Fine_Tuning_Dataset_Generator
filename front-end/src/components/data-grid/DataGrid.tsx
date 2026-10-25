import { useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, RefreshCw, SearchX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ColumnFilterButton } from './ColumnFilterButton';
import { ColumnsMenu } from './ColumnsMenu';
import { GridPagination } from './GridPagination';
import { GridSearch } from './GridSearch';
import { PAGE_SIZE_OPTIONS, describeFilter, withFilter } from './query';
import { valueOf } from './local-data-source';
import { EMPTY_SELECTION, isSelected, selectedCount } from './types';
import type { FilterCondition, GridColumn, GridQuery, SelectionMode, SelectionState, SortModel } from './types';
import { useColumnLayout } from './use-column-layout';

const SELECT_COL_WIDTH = 44;
const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 44;

export interface DataGridProps<T> {
  /** Column definitions: what each column shows and how it behaves. */
  columns: GridColumn<T>[];
  /** The rows of the CURRENT page. The grid never slices; it shows what it's given. */
  rows: T[];
  /** Rows matching the query across all pages (drives pagination and "select all"). */
  total: number;
  getRowId: (row: T) => string;

  /** page / pageSize / sort / filters / search. Own it with useGridQuery(). */
  query: GridQuery;
  onQueryChange: (query: GridQuery) => void;

  /** First load: shows skeleton rows. */
  loading?: boolean;
  /** Background refresh: keeps the rows, shows a thin progress bar. */
  fetching?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Adds a refresh button to the toolbar. */
  onRefresh?: () => void;

  /** 'none' (default) | 'single' (row click selects) | 'multiple' (checkbox column, Shift-click range, select across pages). */
  selection?: SelectionMode;
  selected?: SelectionState;
  onSelectedChange?: (selected: SelectionState) => void;
  /** Buttons shown next to "N selected" while something is selected. */
  selectionActions?: ReactNode;

  /** Called when a row is clicked (not when a button/checkbox inside it is). */
  onRowClick?: (row: T) => void;

  /** Shows the search box when set. */
  searchPlaceholder?: string;
  title?: ReactNode;
  description?: ReactNode;
  /** Buttons in the card header, top right. */
  actions?: ReactNode;
  /** Shown when there are no rows and no search/filters are active. */
  emptyState?: ReactNode;

  pageSizeOptions?: number[];
  /** Remember column order, visibility, widths and page size under this name. */
  storageKey?: string;
  className?: string;
  /** Accessible name for the grid. */
  label?: string;
}

const isInteractive = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  !!target.closest('button, a, input, select, textarea, label, [role="checkbox"], [role="switch"], [role="combobox"], [role="menuitem"]');

const alignClass = { left: 'justify-start text-left', center: 'justify-center text-center', right: 'justify-end text-right' } as const;

export function DataGrid<T>({
  columns,
  rows,
  total,
  getRowId,
  query,
  onQueryChange,
  loading = false,
  fetching = false,
  error = null,
  onRetry,
  onRefresh,
  selection = 'none',
  selected = EMPTY_SELECTION,
  onSelectedChange,
  selectionActions,
  onRowClick,
  searchPlaceholder,
  title,
  description,
  actions,
  emptyState,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  storageKey,
  className,
  label,
}: DataGridProps<T>) {
  const layout = useColumnLayout(columns, storageKey);
  const visible = layout.visible;
  const hasSelectCol = selection !== 'none';

  /* ---------- column widths: live while dragging, committed on release ---------- */
  const [live, setLive] = useState<{ id: string; width: number } | null>(null);
  const widthFor = (col: GridColumn<T>) => (live?.id === col.id ? live.width : layout.widthOf(col));
  // Columns the user hasn't resized stretch (in proportion to their width) to fill the grid; a column that
  // was dragged, or can't be resized (e.g. actions), keeps its exact width.
  const track = (c: GridColumn<T>) => {
    const w = widthFor(c);
    const fixed = c.resizable === false || layout.hasCustomWidth(c) || live?.id === c.id;
    return fixed ? `${w}px` : `minmax(${w}px, ${w}fr)`;
  };
  const template = [...(hasSelectCol ? [`${SELECT_COL_WIDTH}px`] : []), ...visible.map(track)].join(' ');
  const minWidth = (hasSelectCol ? SELECT_COL_WIDTH : 0) + visible.reduce((sum, c) => sum + widthFor(c), 0);

  /* ---------- sorting ---------- */
  function toggleSort(col: GridColumn<T>, additive: boolean) {
    const current = query.sort.find((s) => s.field === col.id);
    const next: SortModel | null = !current ? { field: col.id, dir: 'asc' } : current.dir === 'asc' ? { field: col.id, dir: 'desc' } : null;
    let sort: SortModel[];
    if (!additive) sort = next ? [next] : [];
    else if (current) sort = query.sort.flatMap((s) => (s.field === col.id ? (next ? [next] : []) : [s]));
    else sort = [...query.sort, next!];
    onQueryChange({ ...query, sort, page: 1 });
  }

  /* ---------- selection ---------- */
  const lastClicked = useRef<number | null>(null);
  const pageIds = rows.map(getRowId);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => isSelected(selected, id));
  const someOnPage = pageIds.some((id) => isSelected(selected, id));
  const count = selectedCount(selected, total);

  function setMany(ids: string[], on: boolean) {
    if (!onSelectedChange) return;
    if (selected.mode === 'ids') {
      const next = new Set(selected.ids);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      onSelectedChange({ mode: 'ids', ids: next });
    } else {
      const next = new Set(selected.excludedIds);
      for (const id of ids) {
        if (on) next.delete(id);
        else next.add(id);
      }
      onSelectedChange({ mode: 'all', excludedIds: next });
    }
  }

  function selectRow(id: string, index: number, on: boolean, shift: boolean) {
    if (selection === 'single') {
      onSelectedChange?.({ mode: 'ids', ids: new Set([id]) });
    } else if (shift && lastClicked.current !== null) {
      const from = Math.min(lastClicked.current, index);
      const to = Math.max(lastClicked.current, index);
      setMany(pageIds.slice(from, to + 1), on);
    } else {
      setMany([id], on);
    }
    lastClicked.current = index;
  }

  function handleRowClick(e: MouseEvent, row: T, index: number) {
    if (isInteractive(e.target)) return;
    if (selection === 'single') selectRow(getRowId(row), index, true, false);
    onRowClick?.(row);
  }

  function handleRowKey(e: KeyboardEvent, row: T, index: number) {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter') {
      if (selection === 'single') selectRow(getRowId(row), index, true, false);
      onRowClick?.(row);
    } else if (e.key === ' ' && selection !== 'none') {
      e.preventDefault();
      selectRow(getRowId(row), index, !isSelected(selected, getRowId(row)), e.shiftKey);
    }
  }

  /* ---------- filters ---------- */
  const hasFilters = query.filters.length > 0 || query.search.trim().length > 0;
  const filterOf = (id: string): FilterCondition | undefined => query.filters.find((f) => f.field === id);
  const clearAll = () => onQueryChange({ ...query, page: 1, filters: [], search: '' });

  /* ---------- column drag-and-drop ---------- */
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [resizing, setResizing] = useState(false);

  const interactive = selection === 'single' || !!onRowClick;
  const showEmpty = !loading && !error && rows.length === 0;
  const skeletonRows = Math.min(query.pageSize, 10);

  return (
    <section className={cn('flex min-h-[26rem] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card', className)}>
      {(title || actions) && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        {searchPlaceholder && (
          <GridSearch
            value={query.search}
            placeholder={searchPlaceholder}
            onCommit={(search) => onQueryChange({ ...query, search, page: 1 })}
          />
        )}

        {count > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-accent px-2.5 py-1 text-sm">
            <span className="font-medium">{formatNumber(count)} selected</span>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={() => onSelectedChange?.(EMPTY_SELECTION)}
            >
              Clear
            </button>
            {selectionActions}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {onRefresh && (
            <Button variant="ghost" size="icon-sm" aria-label="Refresh" onClick={onRefresh}>
              <RefreshCw className={cn(fetching && 'animate-spin')} />
            </Button>
          )}
          <ColumnsMenu
            columns={layout.ordered}
            hidden={layout.hidden}
            onToggle={layout.toggle}
            onMove={layout.moveBy}
            onReset={layout.reset}
            canReset={layout.isCustomised}
          />
        </div>
      </div>

      {/* active filter chips */}
      {query.filters.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2">
          {query.filters.map((f) => {
            const col = columns.find((c) => c.id === f.field);
            const options = col?.filter?.type === 'select' ? col.filter.options : undefined;
            return (
              <span key={f.field} className="inline-flex items-center gap-1 rounded-full bg-secondary py-0.5 pr-1 pl-2.5 text-xs">
                <span className="text-muted-foreground">{col?.header ?? f.field}:</span>
                <span className="max-w-48 truncate font-medium">
                  {describeFilter(f, (v) => options?.find((o) => o.value === v)?.label ?? v)}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${col?.header ?? f.field} filter`}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                  onClick={() => onQueryChange(withFilter(query, f.field, null))}
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={clearAll}
          >
            Clear all
          </button>
        </div>
      )}

      {/* "select all matching" banner */}
      {selection === 'multiple' && total > rows.length && ((selected.mode === 'ids' && allOnPage) || selected.mode === 'all') && (
        <div className="shrink-0 border-b border-border bg-accent/70 px-4 py-2 text-center text-sm">
          {selected.mode === 'all' ? (
            <>
              {count === total ? (
                <>All <b>{formatNumber(total)}</b> rows are selected.</>
              ) : (
                <><b>{formatNumber(count)}</b> of {formatNumber(total)} rows are selected.</>
              )}{' '}
              <button type="button" className="font-medium underline underline-offset-2" onClick={() => onSelectedChange?.(EMPTY_SELECTION)}>
                Clear selection
              </button>
            </>
          ) : (
            <>
              All <b>{rows.length}</b> rows on this page are selected.{' '}
              <button
                type="button"
                className="font-medium underline underline-offset-2"
                onClick={() => onSelectedChange?.({ mode: 'all', excludedIds: new Set() })}
              >
                Select all {formatNumber(total)} rows
              </button>
            </>
          )}
        </div>
      )}

      {/* grid */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {fetching && !loading && <div className="absolute inset-x-0 top-0 z-20 h-0.5 animate-pulse bg-foreground/40" aria-hidden="true" />}

        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          <div
            role="grid"
            aria-label={label ?? (typeof title === 'string' ? title : undefined)}
            aria-rowcount={total + 1}
            aria-colcount={visible.length + (hasSelectCol ? 1 : 0)}
            aria-multiselectable={selection === 'multiple' || undefined}
            aria-busy={loading || fetching || undefined}
            className="flex w-full flex-1 flex-col text-sm"
            style={{ minWidth }}
          >
            {/* header */}
            <div
              role="row"
              className="sticky top-0 z-10 grid border-b border-border bg-secondary"
              style={{ gridTemplateColumns: template, height: HEADER_HEIGHT }}
            >
              {hasSelectCol && (
                <div role="columnheader" className="flex items-center justify-center border-r border-border/60">
                  {selection === 'multiple' && (
                    <Checkbox
                      checked={allOnPage ? true : someOnPage ? 'indeterminate' : false}
                      disabled={rows.length === 0}
                      onCheckedChange={() => setMany(pageIds, !allOnPage)}
                      aria-label="Select all rows on this page"
                    />
                  )}
                </div>
              )}

              {visible.map((col) => {
                const sortIndex = query.sort.findIndex((s) => s.field === col.id);
                const sort = sortIndex >= 0 ? query.sort[sortIndex] : undefined;
                const sortable = col.sortable !== false;
                const canDrag = col.reorderable !== false && !resizing;
                return (
                  <div
                    key={col.id}
                    role="columnheader"
                    aria-sort={sort ? (sort.dir === 'asc' ? 'ascending' : 'descending') : sortable ? 'none' : undefined}
                    draggable={canDrag}
                    onDragStart={(e) => {
                      setDragId(col.id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', col.id);
                    }}
                    onDragOver={(e) => {
                      if (dragId && dragId !== col.id) {
                        e.preventDefault();
                        setOverId(col.id);
                      }
                    }}
                    onDragLeave={() => setOverId((o) => (o === col.id ? null : o))}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragId) layout.moveTo(dragId, col.id);
                      setDragId(null);
                      setOverId(null);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverId(null);
                    }}
                    className={cn(
                      'relative flex min-w-0 items-center gap-1 border-r border-border/60 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase select-none',
                      alignClass[col.align ?? 'left'],
                      dragId === col.id && 'opacity-50',
                      overId === col.id && 'shadow-[inset_2px_0_0_0_var(--foreground)]',
                      col.headerClassName,
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={(e) => toggleSort(col, e.shiftKey)}
                        title="Click to sort, Shift-click to add a second sort"
                        className="flex min-w-0 items-center gap-1 rounded uppercase outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
                      >
                        <span className={cn('truncate', col.hideHeader && 'sr-only')}>{col.header}</span>
                        {sort && (
                          <span className="inline-flex shrink-0 items-center text-foreground">
                            {sort.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                            {query.sort.length > 1 && <span className="text-[10px]">{sortIndex + 1}</span>}
                          </span>
                        )}
                      </button>
                    ) : (
                      <span className={cn('truncate', col.hideHeader && 'sr-only')}>{col.header}</span>
                    )}

                    <ColumnFilterButton
                      column={col}
                      condition={filterOf(col.id)}
                      onChange={(c) => onQueryChange(withFilter(query, col.id, c))}
                    />

                    {col.resizable !== false && (
                      <ResizeHandle
                        label={`Resize ${col.header} column`}
                        onStart={() => setResizing(true)}
                        onMove={(w) => setLive({ id: col.id, width: Math.min(col.maxWidth ?? 1200, Math.max(col.minWidth ?? 60, w)) })}
                        onEnd={(w) => {
                          layout.setWidth(col, w);
                          setLive(null);
                          setResizing(false);
                        }}
                        onReset={() => layout.resetWidth(col)}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* rows */}
            {loading
              ? Array.from({ length: skeletonRows }, (_, i) => (
                  <div key={i} role="row" className="grid border-b border-border" style={{ gridTemplateColumns: template, height: ROW_HEIGHT }}>
                    {hasSelectCol && (
                      <div className="flex items-center justify-center border-r border-border/60">
                        <Skeleton className="size-4" />
                      </div>
                    )}
                    {visible.map((c, j) => (
                      <div key={c.id} className="flex items-center border-r border-border/60 px-4">
                        <Skeleton className="h-4" style={{ width: `${55 + ((i * 7 + j * 13) % 35)}%` }} />
                      </div>
                    ))}
                  </div>
                ))
              : rows.map((row, index) => {
                  const id = getRowId(row);
                  const isSel = isSelected(selected, id);
                  return (
                    <div
                      key={id}
                      role="row"
                      aria-rowindex={(query.page - 1) * query.pageSize + index + 2}
                      aria-selected={selection !== 'none' ? isSel : undefined}
                      tabIndex={interactive || selection !== 'none' ? 0 : undefined}
                      onClick={interactive ? (e) => handleRowClick(e, row, index) : undefined}
                      onKeyDown={interactive || selection !== 'none' ? (e) => handleRowKey(e, row, index) : undefined}
                      className={cn(
                        'grid border-b border-border outline-none transition-colors',
                        isSel ? 'bg-accent' : 'hover:bg-accent/50',
                        interactive && 'cursor-pointer',
                        'focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-inset',
                        fetching && 'opacity-80',
                      )}
                      style={{ gridTemplateColumns: template, minHeight: ROW_HEIGHT }}
                    >
                      {hasSelectCol && (
                        <div role="gridcell" className="flex items-center justify-center border-r border-border/60">
                          {selection === 'multiple' ? (
                            <Checkbox
                              checked={isSel}
                              onClick={(e) => selectRow(id, index, !isSel, e.shiftKey)}
                              aria-label={`Select row ${index + 1}`}
                            />
                          ) : (
                            <span
                              className={cn('size-4 rounded-full border border-input', isSel && 'border-[5px] border-foreground')}
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      )}
                      {visible.map((col) => {
                        const content = col.cell ? col.cell(row) : String(valueOf(col, row) ?? '');
                        return (
                          <div
                            key={col.id}
                            role="gridcell"
                            className={cn(
                              'flex min-w-0 items-center border-r border-border/60 px-4',
                              col.wrap && 'py-2.5',
                              alignClass[col.align ?? 'left'],
                              col.cellClassName,
                            )}
                          >
                            <div className={cn('min-w-0', !col.wrap && 'truncate')}>{content}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

            {/* filler: keeps gridlines and row lines going to the bottom edge */}
            <div
              role="presentation"
              className="grid flex-1"
              style={{
                gridTemplateColumns: template,
                backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${ROW_HEIGHT - 1}px, var(--border) ${ROW_HEIGHT - 1}px, var(--border) ${ROW_HEIGHT}px)`,
              }}
            >
              {hasSelectCol && <div className="border-r border-border/60" />}
              {visible.map((c) => (
                <div key={c.id} className="border-r border-border/60" />
              ))}
            </div>
          </div>
        </div>

        {/* states that sit over the empty body */}
        {showEmpty && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center p-6" style={{ top: HEADER_HEIGHT }}>
            <div className="pointer-events-auto max-w-sm rounded-xl bg-card/90 text-center">
              {hasFilters ? (
                <div className="flex flex-col items-center gap-3 px-6 py-4">
                  <span className="flex size-11 items-center justify-center rounded-full bg-secondary">
                    <SearchX className="size-5 text-foreground/60" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">No matching rows</p>
                    <p className="mt-1 text-sm text-muted-foreground">Nothing fits your search or filters.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={clearAll}>Clear search and filters</Button>
                </div>
              ) : (
                (emptyState ?? <p className="px-6 py-4 text-sm text-muted-foreground">Nothing here yet.</p>)
              )}
            </div>
          </div>
        )}

        {error && !loading && (
          <div role="alert" className="absolute inset-x-0 bottom-0 flex items-center justify-center p-6" style={{ top: HEADER_HEIGHT }}>
            <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl bg-card/90 px-6 py-4 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-clay/15 text-clay-fg">
                <AlertCircle className="size-5" />
              </span>
              <div>
                <p className="text-sm font-medium">Couldn’t load this</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
              {onRetry && (
                <Button variant="outline" size="sm" loading={fetching} onClick={onRetry}>Try again</Button>
              )}
            </div>
          </div>
        )}
      </div>

      <GridPagination
        page={query.page}
        pageSize={query.pageSize}
        total={total}
        pageSizeOptions={pageSizeOptions}
        onPageChange={(page) => onQueryChange({ ...query, page })}
        onPageSizeChange={(pageSize) => onQueryChange({ ...query, pageSize, page: 1 })}
      />
    </section>
  );
}

/* Drag handle on a header's right edge. Double-click restores the default width. */
function ResizeHandle({
  label,
  onStart,
  onMove,
  onEnd,
  onReset,
}: {
  label: string;
  onStart: () => void;
  onMove: (width: number) => void;
  onEnd: (width: number) => void;
  onReset: () => void;
}) {
  const drag = useRef<{ x: number; width: number; current: number } | null>(null);

  function down(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    // start from the width actually on screen (a stretched column is wider than its stored width)
    const width = e.currentTarget.parentElement?.getBoundingClientRect().width ?? 0;
    drag.current = { x: e.clientX, width, current: width };
    onStart();
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    d.current = d.width + (e.clientX - d.x);
    onMove(d.current);
  }
  function up(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    drag.current = null;
    onEnd(d.current);
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      draggable={false}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onDoubleClick={onReset}
      onClick={(e) => e.stopPropagation()}
      className="group absolute top-0 right-0 z-10 flex h-full w-2 translate-x-1 cursor-col-resize touch-none justify-center"
    >
      <span className="h-full w-px bg-transparent transition-colors group-hover:bg-foreground/40 group-active:bg-foreground" />
    </div>
  );
}
