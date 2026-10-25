import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useUploadDocuments } from '../queries';
import { ACCEPTED_EXTENSIONS } from '../types';

function hasAcceptedExtension(name: string) {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function UploadDropzone({ projectId }: { projectId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const upload = useUploadDocuments(projectId);

  function submit(list: FileList | File[]) {
    const files = Array.from(list);
    if (files.length === 0 || upload.isPending) return;

    const rejected = files.filter((f) => !hasAcceptedExtension(f.name));
    if (rejected.length > 0) {
      toast.error(`Unsupported file${rejected.length > 1 ? 's' : ''}: ${rejected.map((f) => f.name).join(', ')}`, {
        description: `Allowed: ${ACCEPTED_EXTENSIONS.join(', ')}`,
      });
      return;
    }
    upload.mutate(files);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    submit(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'rounded-2xl border border-dashed bg-card transition-colors',
        dragging ? 'border-foreground/50 bg-accent' : 'border-input',
      )}
    >
      <button
        type="button"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center gap-2 rounded-2xl px-6 py-8 text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-wait"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-secondary">
          <UploadCloud className="size-5 text-foreground/70" />
        </span>
        <span className="text-sm font-medium">
          {upload.isPending ? `Uploading… ${upload.progress}%` : 'Drop files here, or click to browse'}
        </span>
        <span className="text-xs text-muted-foreground">PDF or images ({ACCEPTED_EXTENSIONS.join(' ')}). Only PDFs can be processed for now.</span>
      </button>

      {upload.isPending && (
        <div className="px-6 pb-5">
          <Progress value={upload.progress} aria-label="Upload progress" />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={ACCEPTED_EXTENSIONS.join(',')}
        onChange={(e) => {
          if (e.target.files) submit(e.target.files);
          e.target.value = ''; // allow re-selecting the same file
        }}
      />
    </div>
  );
}
