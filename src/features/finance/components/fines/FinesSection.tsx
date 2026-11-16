import { useWorkspace } from '@/features/auth';

import { FineRules } from './FineRules';
import { IssuedFines } from './IssuedFines';
import { SuggestedFines } from './SuggestedFines';

/**
 * Community Money, "Fines" tab: suggestions and the issued list for whoever
 * issues fines (finance.fine.issue), the rules for whoever sets them
 * (finance.fine.manage).
 */
export function FinesSection() {
  const { can } = useWorkspace();
  const canIssue = can('finance.fine.issue');
  const canManage = can('finance.fine.manage');

  return (
    <div className="money-section">
      {canIssue && <SuggestedFines />}
      {canIssue && <IssuedFines />}
      {canManage && <FineRules />}
    </div>
  );
}
