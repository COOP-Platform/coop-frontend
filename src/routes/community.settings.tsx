import { createFileRoute } from '@tanstack/react-router';

import { CommunitySettings } from '@/features/communities/components/settings/CommunitySettings';

interface SettingsSearch {
  /** Which section is open; the community profile when absent. */
  tab?: 'privacy';
  /** Profile edit mode. Ignored for members who may not edit. */
  edit?: boolean;
}

export const Route = createFileRoute('/community/settings')({
  validateSearch: (raw: Record<string, unknown>): SettingsSearch => ({
    tab: raw.tab === 'privacy' ? 'privacy' : undefined,
    edit: raw.edit === true || raw.edit === 'true' ? true : undefined,
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { tab, edit } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <CommunitySettings
      tab={tab ?? 'profile'}
      editing={edit === true}
      onNavigate={(next) =>
        void navigate({
          search: {
            tab: next.tab === 'privacy' ? 'privacy' : undefined,
            edit: next.editing ? true : undefined,
          },
        })
      }
    />
  );
}
