import { QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, Link, Outlet } from '@tanstack/react-router';

import { queryClient } from '@/lib/query-client';

// Chrome-less on purpose: not every route wants the app header/nav/footer
// (e.g. /login). Routes that do opt in via the `_app` pathless layout route,
// which renders <AppLayout />.
export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorBoundary,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
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
