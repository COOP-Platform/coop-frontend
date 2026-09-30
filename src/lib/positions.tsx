/*
 * Presentation rules for governance positions, shared by the Members and
 * Positions modules. Positions are free-text, community-owned rows on the
 * backend (a family calls its admin "Head of Household", a cooperative
 * "Chairperson"), so the icon is picked from the name, with a generic badge
 * for anything a community invented.
 */
import type { SVGProps } from 'react';

import {
  IconAdvisor,
  IconAward,
  IconBanknote,
  IconCommunity,
  IconFeather,
  IconGavel,
  IconIdBadge,
  IconMegaphone,
  IconShieldCheck,
  IconUserCheck,
} from '@/components/ui';

type Icon = (props: SVGProps<SVGSVGElement>) => JSX.Element;

const RULES: readonly [RegExp, Icon][] = [
  [/vice|deputy/i, IconUserCheck],
  [/chair|president|head|director|leader/i, IconGavel],
  [/treasur|finance|loan/i, IconBanknote],
  [/secretar|clerk/i, IconFeather],
  [/advis|elder|counsel/i, IconAdvisor],
  [/mobili|event|captain|coach/i, IconMegaphone],
  [/audit/i, IconShieldCheck],
  [/^members?$/i, IconCommunity],
  [/officer/i, IconAward],
];

interface PositionIconProps extends SVGProps<SVGSVGElement> {
  name: string;
}

export function PositionIcon({ name, ...props }: PositionIconProps) {
  const Icon = RULES.find(([pattern]) => pattern.test(name))?.[1] ?? IconIdBadge;
  return <Icon {...props} />;
}
