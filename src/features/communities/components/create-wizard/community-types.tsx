import {
  IconBall,
  IconChurch,
  IconGraduationCap,
  IconHandHeart,
  IconHandshake,
  IconIdBadge,
  IconUser,
  IconPiggyBank,
  IconSprout,
  IconUsers,
} from '@/components/ui';
import type { RadioCardOption } from '@/components/ui';

/** Card copy for each `CommunityType`, labels as the backend names them. */
export const COMMUNITY_TYPES: readonly RadioCardOption[] = [
  { value: 'family', title: 'Family', description: 'Kinship & lineage trust', icon: <IconUsers /> },
  {
    value: 'savings_group',
    title: 'Savings group',
    description: 'Ibimina, Chama, VSLA',
    icon: <IconPiggyBank />,
  },
  {
    value: 'cooperative',
    title: 'Cooperative',
    description: 'Producers, artisans, trade',
    icon: <IconHandshake />,
  },
  {
    value: 'church',
    title: 'Faith-based',
    description: 'Fellowship, parish, fund',
    icon: <IconChurch />,
  },
  { value: 'ngo', title: 'NGO', description: 'Civic action & grants', icon: <IconHandHeart /> },
  {
    value: 'youth_group',
    title: 'Youth guild',
    description: 'Talent & skill incubators',
    icon: <IconSprout />,
  },
  {
    value: 'club',
    title: 'Club & sport',
    description: 'Leagues, wellness, teams',
    icon: <IconBall />,
  },
  {
    value: 'alumni',
    title: 'Alumni',
    description: 'Graduates & institutional',
    icon: <IconGraduationCap />,
  },
];

/** "cooperative" -> "Cooperative", from the same catalogue the cards use. */
export function communityTypeLabel(type: string): string {
  return COMMUNITY_TYPES.find((option) => option.value === type)?.title ?? type;
}

/** The committee question on step 1 — `with_committee` on the create request. */
export const COMMITTEE_OPTIONS: readonly RadioCardOption[] = [
  {
    value: 'yes',
    title: 'Yes, set up a committee',
    description: 'Suggested officer positions for your type, ready to assign',
    icon: <IconIdBadge />,
  },
  {
    value: 'no',
    title: 'No committee',
    description: 'Just you as administrator — add positions later if needed',
    icon: <IconUser />,
  },
];
