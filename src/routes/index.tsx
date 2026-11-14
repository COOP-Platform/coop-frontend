import { createFileRoute, redirect } from '@tanstack/react-router';

import { hasCommunity, requireUser } from '@/features/auth';
import { isSignedIn } from '@/lib/auth/session';

// The product is organised into apps; Community is where "home" goes (after
// sign-in, after creating a community, ...). A Platform Administrator with no
// community of their own goes to the platform area instead (#21); one who
// also belongs to a community lands in it like anyone else, and finds the
// platform area at /platform.
export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    if (isSignedIn()) {
      const me = await requireUser();
      if (me.is_platform_admin && !hasCommunity(me)) {
        throw redirect({ to: '/platform' });
      }
    }
    throw redirect({ to: '/community' });
  },
});
