import { useState } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { FilterCondition, GridColumn } from './types';

interface ColumnFilterButtonProps<T> {
  column: GridColumn<T>;
  condition: FilterCondition | undefined;
  onChange: (condition: FilterCondition | null) => void;
}

/** Funnel button in a column header; opens the filter editor for that column's filter type. */
export function ColumnFilterButton<T>({ column, condition, onChange }: ColumnFilterButtonProps<T>) {
  const [open, setOpen] = useState(false);
  if (!column.filter) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Filter ${column.header}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground/70 outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30',
            condition && 'bg-foreground/10 text-foreground',
          )}
        >
          <Filter className="size-3.5" />
        </button>
      </PopoverTrigger>
      {/* remount the editor on open so its fields start from the applied condition */}
      {open && (
        <PopoverContent align="start" className="w-64" onClick={(e) => e.stopPropagation()}>
          <FilterEditor
            column={column}
            condition={condition}
            onApply={(c) => { onChange(c); setOpen(false); }}
            onClear={() => { onChange(null); setOpen(false); }}
          />
        </PopoverContent>
      )}
    </Popover>
  );
}

interface FilterEditorProps<T> {
  column: GridColumn<T>;
  condition: FilterCondition | undefined;
  onApply: (c: FilterCondition) => void;
  onClear: () => void;
}

function FilterEditor<T>({ column, condition, onApply, onClear }: FilterEditorProps<T>) {
  const filter = column.filter!;

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => e.preventDefault()}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase">Filter {column.header}</p>
      {filter.type === 'text' && <TextEditor column={column} condition={condition} onApply={onApply} onClear={onClear} />}
      {filter.type === 'select' && <SelectEditor column={column} options={filter.options} condition={condition} onApply={onApply} onClear={onClear} />}
      {(filter.type === 'number' || filter.type === 'date') && (
        <RangeEditor column={column} type={filter.type} condition={condition} onApply={onApply} onClear={onClear} />
      )}
    </form>
  );
}

function Actions({ canApply, onApply, onClear, hasCondition }: { canApply: boolean; onApply: () => void; onClear: () => void; hasCondition: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={!hasCondition}>Clear</Button>
      <Button type="submit" size="sm" disabled={!canApply} onClick={onApply}>Apply</Button>
    </div>
  );
}

type EditorProps<T> = Pick<FilterEditorProps<T>, 'column' | 'condition' | 'onApply' | 'onClear'>;

function TextEditor<T>({ column, condition, onApply, onClear }: EditorProps<T>) {
  const [value, setValue] = useState(condition?.op === 'contains' ? condition.value : '');
  return (
    <>
      <Input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Contains…" aria-label={`${column.header} contains`} />
      <Actions
        hasCondition={!!condition}
        canApply={value.trim().length > 0}
        onClear={onClear}
        onApply={() => onApply({ field: column.id, op: 'contains', value: value.trim() })}
      />
    </>
  );
}

function SelectEditor<T>({ column, options, condition, onApply, onClear }: EditorProps<T> & { options: { label: string; value: string }[] }) {
  const [picked, setPicked] = useState<string[]>(condition?.op === 'in' ? condition.value : []);
  const toggle = (v: string, on: boolean) => setPicked((p) => (on ? [...p, v] : p.filter((x) => x !== v)));
  return (
    <>
      <div className="grid max-h-56 gap-1.5 overflow-auto">
        {options.map((o) => (
          <div key={o.value} className="flex items-center gap-2">
            <Checkbox id={`f-${column.id}-${o.value}`} checked={picked.includes(o.value)} onCheckedChange={(v) => toggle(o.value, v === true)} />
            <Label htmlFor={`f-${column.id}-${o.value}`} className="font-normal">{o.label}</Label>
          </div>
        ))}
      </div>
      <Actions
        hasCondition={!!condition}
        canApply={picked.length > 0}
        onClear={onClear}
        onApply={() => onApply({ field: column.id, op: 'in', value: picked })}
      />
    </>
  );
}

function RangeEditor<T>({ column, type, condition, onApply, onClear }: EditorProps<T> & { type: 'number' | 'date' }) {
  const initial = (): [string, string] => {
    if (condition?.op === 'between') return condition.value;
    if (condition?.op === 'gte') return [condition.value, ''];
    if (condition?.op === 'lte') return ['', condition.value];
    return ['', ''];
  };
  const [[from, to], setRange] = useState<[string, string]>(initial);

  const apply = () => {
    if (from && to) onApply({ field: column.id, op: 'between', value: [from, to] });
    else if (from) onApply({ field: column.id, op: 'gte', value: from });
    else if (to) onApply({ field: column.id, op: 'lte', value: to });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <Label htmlFor={`f-${column.id}-from`} className="text-xs font-normal text-muted-foreground">{type === 'date' ? 'From' : 'Min'}</Label>
          <Input id={`f-${column.id}-from`} type={type === 'date' ? 'date' : 'number'} value={from} onChange={(e) => setRange([e.target.value, to])} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`f-${column.id}-to`} className="text-xs font-normal text-muted-foreground">{type === 'date' ? 'To' : 'Max'}</Label>
          <Input id={`f-${column.id}-to`} type={type === 'date' ? 'date' : 'number'} value={to} onChange={(e) => setRange([from, e.target.value])} />
        </div>
      </div>
      <Actions hasCondition={!!condition} canApply={!!(from || to)} onClear={onClear} onApply={apply} />
    </>
  );
}
