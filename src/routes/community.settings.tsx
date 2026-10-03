import { createFileRoute } from '@tanstack/react-router';

import { EmptyState, IconSettings, IconTile, PageHeader } from '@/components/ui';

export const Route = createFileRoute('/community/settings')({
  component: SettingsPage,
});

// No design yet — a placeholder so the sidebar entry lands somewhere honest.
function SettingsPage() {
  return (
    <div className="page">
      <PageHeader title="Settings" subtitle="Community profile, charter and preferences." />
      <section className="card">
        <EmptyState
          icon={
            <IconTile tone="neutral" size="lg">
              <IconSettings />
            </IconTile>
          }
          title="Settings are on the way"
          message="This screen is not designed yet. It will land in a later sprint."
        />
      </section>
    </div>
  );
}
