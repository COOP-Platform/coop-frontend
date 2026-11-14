import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { IconArrowLeft, PageHeader } from '@/components/ui';
import { hasCommunity, useMe } from '@/features/auth';

interface PlatformHeaderProps {
  title: string;
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
      eyebrow={<span className="eyebrow eyebrow--muted">Platform administration</span>}
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

/** What this area can and cannot do — said once, plainly, on every page that shows data. */
export function ReadOnlyNotice() {
  return (
    <div className="notice notice--info" role="note">
      <div>
        <p className="notice__title">Read-only, by design</p>
        <p className="notice__text">
          Platform Administrators run the service. Nothing here can change a community&apos;s data.
          Opening one community&apos;s records to help with a problem is read-only and is written to
          that community&apos;s audit log.
        </p>
      </div>
    </div>
  );
}
