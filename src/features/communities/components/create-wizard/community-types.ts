/** Each `CommunityType`, as the backend names it, with a plain-language gloss. */
export const COMMUNITY_TYPES = [
  { value: 'family', title: 'Family', description: 'Kinship & lineage trust' },
  { value: 'savings_group', title: 'Savings group', description: 'Ibimina, Chama, VSLA' },
  { value: 'cooperative', title: 'Cooperative', description: 'Producers, artisans, trade' },
  { value: 'church', title: 'Faith-based', description: 'Fellowship, parish, fund' },
  { value: 'ngo', title: 'NGO', description: 'Civic action & grants' },
  { value: 'youth_group', title: 'Youth guild', description: 'Talent & skill incubators' },
  { value: 'club', title: 'Club & sport', description: 'Leagues, wellness, teams' },
  { value: 'alumni', title: 'Alumni', description: 'Graduates & institutional' },
] as const;

/** "cooperative" -> "Cooperative", from the same catalogue the form uses. */
export function communityTypeLabel(type: string): string {
  return COMMUNITY_TYPES.find((option) => option.value === type)?.title ?? type;
}
