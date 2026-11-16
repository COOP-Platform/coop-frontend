import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/features/auth';
import { MyContributions } from '@/features/finance';
import type { MyContributionsView } from '@/features/finance';

interface MyContributionsSearch {
  /** `?record=true` opens the Record Contribution form. */
  record?: boolean;
  /** Which section shows: payments (default), `arrears` or `fines`. */
  view?: Exclude<MyContributionsView, 'payments'>;
}

export const Route = createFileRoute('/finance/my-contributions')({
  // Every member may record their own payment.
  beforeLoad: requirePermission(
    ['finance.contribution.record', 'finance.contribution.view'],
    '/finance',
  ),
  validateSearch: (raw: Record<string, unknown>): MyContributionsSearch => ({
    record: raw.record === true || raw.record === 'true' ? true : undefined,
    view: raw.view === 'arrears' || raw.view === 'fines' ? raw.view : undefined,
  }),
  component: MyContributionsPage,
});

function MyContributionsPage() {
  const { record, view } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <MyContributions
      startRecording={record === true}
      view={view ?? 'payments'}
      onViewChange={(next) =>
        void navigate({
          search: (prev) => ({ ...prev, view: next === 'payments' ? undefined : next }),
          replace: true,
        })
      }
    />
  );
}
