import { createFileRoute } from '@tanstack/react-router';

import { ComingSoon, PageHeader } from '@/components/ui';

export const Route = createFileRoute('/community/settings')({
  component: SettingsPage,
});

// Not built yet — the sidebar entry lands on an honest "coming soon".
function SettingsPage() {
  return (
    <div className="page">
      <PageHeader title="Settings" subtitle="Community profile, charter and preferences." />
      <ComingSoon
        title="Settings are on the way"
        message="Soon you'll manage your community's profile and preferences here."
      />
    </div>
  );
}
