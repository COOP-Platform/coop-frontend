import { createFileRoute } from '@tanstack/react-router';

import { EmptyState, IconFile, IconTile, PageHeader } from '@/components/ui';

export const Route = createFileRoute('/community/reports')({
  component: ReportsPage,
});

// No design yet — a placeholder so the sidebar entry lands somewhere honest.
function ReportsPage() {
  return (
    <div className="page">
      <PageHeader title="Reports" subtitle="Membership and governance reports for the community." />
      <section className="card">
        <EmptyState
          icon={
            <IconTile tone="info" size="lg">
              <IconFile />
            </IconTile>
          }
          title="Reports are on the way"
          message="This screen is not designed yet. It will land in a later sprint."
        />
      </section>
    </div>
  );
}
