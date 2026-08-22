import { QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, Link } from '@tanstack/react-router';

import { AppLayout } from '@/components/layout/AppLayout';
import { queryClient } from '@/lib/query-client';

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorBoundary,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout />
    </QueryClientProvider>
  );
}

function NotFound() {
  return (
    <div className="state">
      <p className="state__title">Page not found</p>
      <p>
        That route doesn&apos;t exist yet. <Link to="/">Go back home</Link>.
      </p>
    </div>
  );
}

function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="state">
      <p className="state__title">Something went wrong</p>
      <p>{error.message}</p>
    </div>
  );
}
