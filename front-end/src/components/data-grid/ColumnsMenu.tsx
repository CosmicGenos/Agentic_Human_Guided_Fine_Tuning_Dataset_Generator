import { ArrowDown, ArrowUp, Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { GridColumn } from './types';

interface ColumnsMenuProps<T> {
  /** Every column in display order, hidden ones included. */
  columns: GridColumn<T>[];
  hidden: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onReset: () => void;
  canReset: boolean;
}

/** "Columns" button: show/hide columns and change their order (headers can also be dragged). */
export function ColumnsMenu<T>({ columns, hidden, onToggle, onMove, onReset, canReset }: ColumnsMenuProps<T>) {
  // structural columns (e.g. a row-actions column) are not worth listing
  const menuColumns = columns.filter((c) => !(c.hideHeader && c.hideable === false));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm"><Columns3 /> Columns</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <ul className="grid gap-0.5">
          {menuColumns.map((col, i) => {
            const locked = col.hideable === false;
            return (
              <li key={col.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent">
                <Checkbox
                  id={`col-${col.id}`}
                  checked={!hidden.has(col.id)}
                  disabled={locked}
                  onCheckedChange={() => onToggle(col.id)}
                  aria-label={`Show ${col.header}`}
                />
                <label htmlFor={`col-${col.id}`} className="flex-1 truncate text-sm">{col.header || col.id}</label>
                <Button variant="ghost" size="icon-sm" className="size-6" disabled={i === 0 || col.reorderable === false} onClick={() => onMove(col.id, -1)} aria-label={`Move ${col.header} up`}>
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" className="size-6" disabled={i === menuColumns.length - 1 || col.reorderable === false} onClick={() => onMove(col.id, 1)} aria-label={`Move ${col.header} down`}>
                  <ArrowDown className="size-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 border-t border-border pt-2">
          <Button variant="ghost" size="sm" className="w-full" disabled={!canReset} onClick={onReset}>Reset columns</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
