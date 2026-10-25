import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-cream px-6 text-center text-ink">
      <p className="font-mono text-xs tracking-widest text-ink/50">404</p>
      <h1 className="font-serif text-4xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-sm text-sm text-ink/60">The page you’re looking for doesn’t exist or has moved.</p>
      <Button asChild><Link to="/">Go home</Link></Button>
    </div>
  );
}
