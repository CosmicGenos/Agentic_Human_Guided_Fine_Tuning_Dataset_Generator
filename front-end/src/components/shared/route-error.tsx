import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/** Router-level error boundary: a render crash shows this instead of a blank page. */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something went wrong.';

  return (
    <div role="alert" className="flex min-h-svh flex-col items-center justify-center gap-4 bg-workspace px-6 text-center">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Something broke</h1>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()}>Reload</Button>
        <Button asChild variant="outline"><Link to="/">Go home</Link></Button>
      </div>
    </div>
  );
}
