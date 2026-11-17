import { QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, Link, Outlet } from '@tanstack/react-router';

import { StatePage } from '@/components/ui';
import { queryClient } from '@/lib/query-client';

// Chrome-less on purpose: not every route wants the app header/nav/footer
// (e.g. /login). The app shell comes from each app's layout route, such as
// routes/community.tsx.
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
    <main className="state-page-screen">
      <StatePage
        art="not-found"
        title="Page not found"
        message="The page you are looking for does not exist or has moved."
        actions={
          <Link to="/" className="btn btn--primary btn--inline">
            Go to the dashboard
          </Link>
        }
      />
    </main>
  );
}

function ErrorBoundary({ error }: { error: Error }) {
  return (
    <main className="state-page-screen">
      <StatePage
        art="search"
        title="Something went wrong"
        message={error.message || 'The page could not be shown.'}
        actions={
          <>
            <button
              type="button"
              className="btn btn--primary btn--inline"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
            <Link to="/" className="btn btn--secondary btn--inline">
              Go to the dashboard
            </Link>
          </>
        }
      />
    </main>
  );
}
