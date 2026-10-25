import { API_URL } from '@/lib/api';

export function Footer() {
  return (
    <footer className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-serif text-foreground/70">Luman</span>
          <span className="mx-1.5">·</span>
          Human-guided dataset factory
        </p>
        <nav className="flex items-center gap-4">
          <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer" className="hover:text-foreground">
            API docs
          </a>
          <span>© {new Date().getFullYear()}</span>
        </nav>
      </div>
    </footer>
  );
}
