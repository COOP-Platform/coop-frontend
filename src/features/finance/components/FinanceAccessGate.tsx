import type { ReactNode } from 'react';

import { EmptyState, IconLock } from '@/components/ui';
import { useWorkspace } from '@/features/auth';

interface FinanceAccessGateProps {
  /** Permission the page needs; the sidebar already hides the link without it. */
  permission: string;
  children: ReactNode;
}

/** For a page reached by typing the URL: say so instead of showing a page the API would refuse. */
export function FinanceAccessGate({ permission, children }: FinanceAccessGateProps) {
  const { can } = useWorkspace();

  if (!can(permission)) {
    return (
      <EmptyState
        icon={<IconLock />}
        title="You don't have access to this page"
        message="Ask a community administrator if you need it."
      />
    );
  }
  return <>{children}</>;
}
