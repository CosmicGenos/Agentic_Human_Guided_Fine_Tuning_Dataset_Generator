import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QueryBoundary } from '@/components/shared/query-boundary';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import { useExtraction } from '../queries';

// A 400k-character <pre> makes the page sluggish; show a window and let people expand.
const PREVIEW_CHARS = 60_000;

type View = 'text' | 'enriched';

export function ExtractionViewer({ documentId }: { documentId: string }) {
  const extraction = useExtraction(documentId);
  const [view, setView] = useState<View>('text');
  const [expanded, setExpanded] = useState(false);

  return (
    <QueryBoundary query={extraction}>
      {(x) => {
        const hasEnriched = x.enriched_text !== null;
        const body = view === 'enriched' && hasEnriched ? (x.enriched_text ?? '') : x.text;
        const shown = expanded ? body : body.slice(0, PREVIEW_CHARS);
        const pages = x.metadata['page_count'];
        const method = x.metadata['extraction_method'];

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">{formatNumber(x.char_count)} characters</Badge>
              {typeof pages === 'number' && <Badge variant="neutral">{pages} pages</Badge>}
              {x.image_count > 0 && <Badge variant="neutral">{x.image_count} images</Badge>}
              {typeof method === 'string' && <Badge variant="outline">{method}</Badge>}
            </div>

            {hasEnriched && (
              <div role="group" aria-label="Text version" className="inline-flex rounded-lg bg-secondary p-0.5">
                {(['text', 'enriched'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => { setView(v); setExpanded(false); }}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      view === v ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {v === 'text' ? 'Original' : 'With image descriptions'}
                  </button>
                ))}
              </div>
            )}

            <pre className="max-h-[60vh] overflow-auto rounded-xl border border-border bg-secondary/50 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
              {shown || 'This document has no extracted text.'}
            </pre>
            {!expanded && body.length > PREVIEW_CHARS && (
              <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
                Show all ({formatNumber(body.length - PREVIEW_CHARS)} more characters)
              </Button>
            )}

            {x.images.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Images</h3>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {x.images.map((img) => (
                    <li key={img.storage_key} className="flex gap-3 px-3 py-2.5">
                      <ImageIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs">{img.filename}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{img.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        );
      }}
    </QueryBoundary>
  );
}
