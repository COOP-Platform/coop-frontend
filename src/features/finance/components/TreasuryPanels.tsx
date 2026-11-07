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
import { formatDate } from '@/lib/format/date';

import type { DashboardAccount, FinanceSummary } from '../api/summary';
import { formatAmount } from '../format';
import { Money } from './Money';

export interface QuickAction {
  label: string;
  to: LinkProps['to'];
  search?: LinkProps['search'];
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
            <Link to={action.to} search={action.search} className="finance-actions__item">
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

const KIND_LABEL: Record<DashboardAccount['kind'], string> = {
  bank: 'Bank account',
  mobile_money: 'Mobile money',
  cash: 'Cash box',
  other: 'Other',
};

interface AccountBalancesProps {
  accounts: readonly DashboardAccount[];
  /** Sum of the entered balances; null when none has a balance yet. */
  totalMinor: number | null;
  /** Entered total minus the wallet: shows when the books and the accounts disagree. */
  differenceMinor: number | null;
  currency: string;
}

/**
 * The Treasurer's accounts with the balance last typed in for each (S3-10b).
 * They sit next to the wallet and never feed it.
 */
export function AccountBalances({
  accounts,
  totalMinor,
  differenceMinor,
  currency,
}: AccountBalancesProps) {
  return (
    <section className="card finance-panel" aria-labelledby="accounts-title">
      <header className="section-head">
        <div className="section-head__text">
          <h2 id="accounts-title" className="section-head__title">
            Account Balances
          </h2>
          <p className="section-head__subtitle">Entered by the Treasurer</p>
        </div>
        <IconWallet width={22} height={22} aria-hidden="true" />
      </header>

      <ul className="finance-accounts" role="list">
        {accounts.map((account) => {
          const mobile = account.kind === 'mobile_money';
          return (
            <li key={account.id} className="finance-accounts__item">
              <IconTile tone={mobile ? 'warning' : 'info'}>
                {mobile ? <IconPhone /> : <IconInstitution />}
              </IconTile>
              <div className="finance-accounts__body">
                <p className="finance-accounts__name">{account.name}</p>
                <p className="finance-accounts__detail">
                  {KIND_LABEL[account.kind]}
                  {account.as_of ? ` · as of ${formatDate(account.as_of)}` : ''}
                </p>
              </div>
              <p className="finance-accounts__balance">
                {account.balance_minor === null ? '—' : formatAmount(account.balance_minor)}
                <span className="money__unit"> {currency}</span>
              </p>
            </li>
          );
        })}
      </ul>

      {totalMinor !== null && (
        <div className="finance-accounts__total">
          <div>
            <p className="finance-accounts__total-label">Total in accounts</p>
            <p className="finance-accounts__total-note">
              {differenceMinor === null || differenceMinor === 0
                ? 'Matches the wallet'
                : `${differenceMinor > 0 ? 'More' : 'Less'} than the wallet by ${formatAmount(
                    Math.abs(differenceMinor),
                  )} ${currency}`}
            </p>
          </div>
          <p className="finance-accounts__total-figure">
            <Money minor={totalMinor} currency={currency} />
          </p>
        </div>
      )}
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
        <p className="finance-members__detail">{members.up_to_date} up to date this year</p>
      </div>
      {members.compliance_rate !== null && (
        <Badge tone={members.compliance_rate >= 100 ? 'success' : 'warning'}>
          {Math.round(members.compliance_rate)}% Compliant
        </Badge>
      )}
    </section>
  );
}

/** Icons for the action list, kept next to the panel that draws them. */
export const ACTION_ICONS = {
  contribution: <IconPlusCircle />,
  expense: <IconSend />,
  statement: <IconFile />,
} as const;
