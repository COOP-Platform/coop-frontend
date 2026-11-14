/*
 * The Platform Administrator area (#21). Deliberately not in `config/apps`:
 * it is not an app community members switch to, only the people who run the
 * service ever see it, and it lives under its own `/platform` prefix.
 */
import { IconCommunity, IconHistory, IconShieldCheck } from '@/components/ui';
import type { AppDefinition } from '@/config/apps';

export const PLATFORM_APP: AppDefinition = {
  id: 'platform',
  name: 'Platform admin',
  description: 'System health, the community directory and the audit log',
  icon: <IconShieldCheck />,
  to: '/platform',
  nav: [
    { label: 'Health', icon: <IconShieldCheck />, to: '/platform', exact: true },
    { label: 'Communities', icon: <IconCommunity />, to: '/platform/communities' },
    { label: 'Audit log', icon: <IconHistory />, to: '/platform/audit-log' },
  ],
};
