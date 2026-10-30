import { Link } from '@tanstack/react-router';
import type { LinkProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import {
  Badge,
  IconChevronRight,
  IconCommunity,
  IconFile,
  IconInstitution,
  IconPhone,
  IconPlusCircle,
  IconSend,
  IconTile,
  IconWallet,
} from '@/components/ui';

import type { FinanceAccount, FinanceSummary } from '../api/summary';
import { formatAmount } from '../format';
import { Money } from './Money';

export interface QuickAction {
  label: string;
  to: LinkProps['to'];
  icon: ReactNode;
  tone: 'brand' | 'warning' | 'info';
}

/** The shortcuts a member is allowed to use; the caller filters by permission. */
export function QuickTreasuryActions({ actions }: { actions: readonly QuickAction[] }) {
  return (
    <section className="card finance-panel" aria-labelledby="quick-actions-title">
      <header className="section-head">
        <div className="section-head__text">
          <h2 id="quick-actions-title" className="section-head__title">
            Quick Treasury Actions
          </h2>
        </div>
      </header>
      <ul className="finance-actions" role="list">
        {actions.map((action) => (
          <li key={action.label}>
            <Link to={action.to} className="finance-actions__item">
              <span className={`finance-actions__icon finance-actions__icon--${action.tone}`}>
                {action.icon}
              </span>
              <span className="finance-actions__label">{action.label}</span>
              <IconChevronRight width={18} height={18} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Mobile-money accounts get a phone, everything else the bank building. */
const isMobileMoney = (name: string) => /mtn|airtel|momo|mobile/i.test(name);

export function AccountBalances({ accounts }: { accounts: readonly FinanceAccount[] }) {
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <section className="card finance-panel" aria-labelledby="accounts-title">
      <header className="section-head">
        <div className="section-head__text">
          <h2 id="accounts-title" className="section-head__title">
            Account Balances
          </h2>
          <p className="section-head__subtitle">Practical asset breakdown</p>
        </div>
        <IconWallet width={22} height={22} aria-hidden="true" />
      </header>

      <ul className="finance-accounts" role="list">
        {accounts.map((account) => (
          <li key={account.name} className="finance-accounts__item">
            <IconTile tone={isMobileMoney(account.name) ? 'warning' : 'info'}>
              {isMobileMoney(account.name) ? <IconPhone /> : <IconInstitution />}
            </IconTile>
            <div className="finance-accounts__body">
              <p className="finance-accounts__name">{account.name}</p>
              {account.detail && <p className="finance-accounts__detail">{account.detail}</p>}
            </div>
            <p className="finance-accounts__balance">
              {formatAmount(account.balance)}
              <span className="money__unit"> RWF</span>
            </p>
          </li>
        ))}
      </ul>

      <div className="finance-accounts__total">
        <div>
          <p className="finance-accounts__total-label">Total verified liquid</p>
          <p className="finance-accounts__total-note">Fully accessible</p>
        </div>
        <p className="finance-accounts__total-figure">
          <Money value={total} />
        </p>
      </div>
    </section>
  );
}

export function MembersActiveCard({ members }: { members: FinanceSummary['members'] }) {
  return (
    <section className="card finance-members" aria-label="Member compliance">
      <IconTile tone="info" size="lg">
        <IconCommunity />
      </IconTile>
      <div className="finance-members__body">
        <p className="finance-members__title">{members.active} Members Active</p>
        <p className="finance-members__detail">{members.up_to_date} up-to-date this month</p>
      </div>
      <Badge tone="success">{Math.round(members.compliance_rate)}% Compliant</Badge>
    </section>
  );
}

/** Icons for the action list, kept next to the panel that draws them. */
export const ACTION_ICONS = {
  contribution: <IconPlusCircle />,
  expense: <IconSend />,
  statement: <IconFile />,
} as const;
