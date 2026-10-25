import { useEffect, useEffectEvent, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface GridSearchProps {
  /** The query's current search text. */
  value: string;
  placeholder: string;
  /** Called 300 ms after the last keystroke (and only if the text changed). */
  onCommit: (text: string) => void;
}

/** Search box that keeps typing instant and only updates the query after a short pause. */
export function GridSearch({ value, placeholder, onCommit }: GridSearchProps) {
  const [text, setText] = useState(value);

  // follow the query if it is changed from outside (e.g. "Clear search and filters")
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setText(value);
  }

  const commit = useEffectEvent(onCommit);
  useEffect(() => {
    if (text === value) return;
    const id = window.setTimeout(() => commit(text), 300);
    return () => window.clearTimeout(id);
  }, [text, value]);

  return (
    <div className="relative max-w-xs min-w-48 flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
    </div>
  );
}
