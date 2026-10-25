import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Ratio = 'even' | 'side-right' | 'side-left';

interface SplitViewProps {
  primary: ReactNode;
  secondary: ReactNode;
  /**
   * even:       1fr | 1fr
   * side-right: wide primary, narrow secondary (default; e.g. list + details)
   * side-left:  narrow primary, wide secondary
   */
  ratio?: Ratio;
  /**
   * From `lg`: grow to the bottom of the workspace and give each pane a bounded height so
   * its content (a grid, a text viewer) scrolls on its own. Below `lg` the panes stack and
   * the page scrolls. Needs to be a direct child of the workspace column.
   */
  fill?: boolean;
  /** Below `lg` the panes stack; show the secondary pane first. */
  secondaryFirstOnStack?: boolean;
}

const COLS: Record<Ratio, string> = {
  'even':       'lg:grid-cols-2',
  'side-right': 'lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]',
  'side-left':  'lg:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]',
};

/** Two-pane screen. One column below `lg`, two from `lg`. Put a <Panel> or <DataGrid> in each slot. */
export function SplitView({ primary, secondary, ratio = 'side-right', fill = false, secondaryFirstOnStack = false }: SplitViewProps) {
  const pane = cn('flex min-w-0 flex-col [&>*]:flex-1', fill && 'lg:min-h-0');
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 lg:gap-5',
        COLS[ratio],
        fill && 'lg:min-h-[26rem] lg:flex-1 lg:grid-rows-[minmax(0,1fr)]',
      )}
    >
      <div className={cn(pane, secondaryFirstOnStack && 'order-2 lg:order-1')}>{primary}</div>
      <div className={cn(pane, secondaryFirstOnStack && 'order-1 lg:order-2')}>{secondary}</div>
    </div>
  );
}
