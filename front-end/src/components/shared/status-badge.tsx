import { Badge } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import type { badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Variant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

interface StatusStyle {
  variant: Variant;
  label?: string;
  /** Pulsing dot: work is in flight. */
  live?: boolean;
}

/** One map for every status the API returns (documents, jobs, registered models). */
const STATUS: Record<string, StatusStyle> = {
  // documents
  uploaded: { variant: 'neutral' },
  queued: { variant: 'info' },
  processing: { variant: 'info', live: true },
  completed: { variant: 'success' },
  failed: { variant: 'danger' },
  // jobs
  running: { variant: 'info', live: true },
  partial: { variant: 'warning', label: 'partial' },
  // registered models
  untested: { variant: 'neutral' },
  ok: { variant: 'success', label: 'ok' },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STATUS[status] ?? { variant: 'neutral' as const };
  return (
    <Badge variant={s.variant} className={cn('capitalize', className)}>
      {s.live && (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      {s.label ?? status}
    </Badge>
  );
}
