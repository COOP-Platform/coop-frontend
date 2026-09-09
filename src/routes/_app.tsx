import { createFileRoute, redirect } from '@tanstack/react-router';

import { AppLayout } from '@/components/layout/AppLayout';
import { isSignedIn } from '@/lib/auth/session';

// Pathless layout route: every route nested under `_app.*` gets the app
// shell (header/nav/footer). Routes outside it (e.g. /login) don't.
export const Route = createFileRoute('/_app')({
  /*
   * Gate for everything inside the shell. This checks only that a token is
   * stored — it does not validate it, so an expired token still gets past and
   * the individual requests 401 instead. That is the honest limit of a
   * client-side guard; the real protection is the API refusing the request,
   * which is exactly what most of this backend does not yet do.
   */
  beforeLoad: () => {
    if (!isSignedIn()) {
      // No `redirect` search param: /login would have to declare a search
      // schema to accept one, and returning the user to where they were is a
      // separate change.
      throw redirect({ to: '/login' });
    }
  },
  component: AppLayout,
});
