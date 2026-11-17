import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { IconArrowLeft, PageHeader } from '@/components/ui';
import { hasCommunity, useMe } from '@/features/auth';

interface PlatformHeaderProps {
  title: string;
  /** At most one short fact line under the title. */
  subtitle?: ReactNode;
  actions?: ReactNode;
}

/**
 * Every /platform page's header. A Platform Administrator who also belongs
 * to a community gets a way back to it here, since the shared sidebar has
 * no slot for one.
 */
export function PlatformHeader({ title, subtitle, actions }: PlatformHeaderProps) {
  const { data: me } = useMe();

  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      actions={
        <>
          {actions}
          {hasCommunity(me) && (
            <Link to="/community" className="link-action platform-back">
              <IconArrowLeft width={16} height={16} aria-hidden="true" />
              Back to your community
            </Link>
          )}
        </>
      }
    />
  );
}
