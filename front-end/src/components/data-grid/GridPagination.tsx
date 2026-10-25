import { useState } from 'react';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNumber } from '@/lib/format';
import { pageCount } from './query';

interface GridPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function GridPagination({ page, pageSize, total, pageSizeOptions, onPageChange, onPageSizeChange }: GridPaginationProps) {
  const pages = pageCount(total, pageSize);
  const current = Math.min(page, pages);
  const first = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const last = Math.min(total, current * pageSize);

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
      <p aria-live="polite">
        {total === 0 ? 'No rows' : <>Showing <span className="font-medium text-foreground">{formatNumber(first)}–{formatNumber(last)}</span> of <span className="font-medium text-foreground">{formatNumber(total)}</span></>}
      </p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex items-center gap-2">
          Rows per page
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger size="sm" className="w-[4.5rem]" aria-label="Rows per page"><SelectValue /></SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="First page" disabled={current <= 1} onClick={() => onPageChange(1)}><ChevronFirst /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Previous page" disabled={current <= 1} onClick={() => onPageChange(current - 1)}><ChevronLeft /></Button>
          <PageJump key={current} current={current} pages={pages} onGo={onPageChange} />
          <Button variant="ghost" size="icon-sm" aria-label="Next page" disabled={current >= pages} onClick={() => onPageChange(current + 1)}><ChevronRight /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Last page" disabled={current >= pages} onClick={() => onPageChange(pages)}><ChevronLast /></Button>
        </div>
      </div>
    </div>
  );
}

/** "Page [ 3 ] of 8": type a number and press Enter (or leave the box) to jump. */
function PageJump({ current, pages, onGo }: { current: number; pages: number; onGo: (page: number) => void }) {
  const [text, setText] = useState(String(current));

  const commit = () => {
    const n = Math.round(Number(text));
    const target = Math.min(n, pages);
    if (Number.isFinite(n) && n >= 1 && target !== current) onGo(target);
    else setText(String(current));
  };

  return (
    <span className="flex items-center gap-1.5 px-1">
      Page
      <Input
        value={text}
        inputMode="numeric"
        aria-label="Page number"
        onChange={(e) => setText(e.target.value.replace(/\D/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur())}
        className="h-7 w-12 px-1 text-center text-xs"
      />
      of {formatNumber(pages)}
    </span>
  );
}
