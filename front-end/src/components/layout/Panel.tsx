import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  /** Right-aligned controls in the panel header (buttons, filters). */
  actions?: ReactNode;
  /** Remove body padding. */
  flush?: boolean;
}

/** White rounded card on the cream workspace. The body scrolls when the panel has a bounded height. */
export function Panel({ title, description, actions, flush = false, className, children, ...rest }: PanelProps) {
  return (
    <section
      className={cn('flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card', className)}
      {...rest}
    >
      {(title || actions) && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('min-h-0 flex-1 overflow-auto', !flush && 'p-4 sm:p-5')}>{children}</div>
    </section>
  );
}
