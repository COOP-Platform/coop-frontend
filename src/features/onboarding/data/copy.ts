/**
 * Static copy for the accept page's "what you get" panel.
 *
 * Product wording, not data: the schema has no concept of tontine tiers or
 * ballots yet. The member's actual category name comes from the invitation
 * preview and is rendered above this list.
 */

export interface AllocationBenefit {
  title: string;
  detail: string;
}

export const ALLOCATION_BENEFITS: readonly AllocationBenefit[] = [
  { title: 'Contribution cycle', detail: 'Monthly collection and draw eligibility' },
  { title: 'Voting rights', detail: 'One ballot on community decisions' },
  { title: 'Shared archive', detail: 'Records, minutes and meeting history' },
];
