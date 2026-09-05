import { createFileRoute } from '@tanstack/react-router';

import { AppLayout } from '@/components/layout/AppLayout';

// Pathless layout route: every route nested under `_app.*` gets the app
// shell (header/nav/footer). Routes outside it (e.g. /login) don't.
export const Route = createFileRoute('/_app')({
  component: AppLayout,
});
