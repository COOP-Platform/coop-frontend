import { useState } from 'react';
import type { FormEvent } from 'react';

import {
  Badge,
  Button,
  Dialog,
  Drawer,
  EmptyState,
  ErrorState,
  IconHistory,
  IconInstitution,
  IconPencil,
  IconPhone,
  IconPlus,
  IconTile,
  IconWallet,
  Input,
  LoadingState,
  Select,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import {
  useAccountBalances,
  useAccounts,
  useCreateAccount,
  useEnterBalance,
  useRetireAccount,
  useUpdateAccount,
} from '../api/accounts';
import type { Account, AccountKind } from '../api/accounts';
import { useCashFlow } from '../api/cashflow';
import { MINOR_PER_MAJOR, formatAmount } from '../format';
import { THIS_MONTH } from '../month';
import { SuccessNotice } from './SuccessNotice';
import { SectionHeader } from './SectionHeader';

const KINDS: { value: AccountKind; label: string }[] = [
  { value: 'bank', label: 'Bank account' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'cash', label: 'Cash box' },
  { value: 'other', label: 'Other' },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.value, k.label])) as Record<
  AccountKind,
  string
>;

const today = () => new Date().toLocaleDateString('en-CA');

/**
 * Where the money actually sits (S3-10b): the bank, mobile money and cash box,
 * each with the balance the Treasurer last read and typed in. Shown next to
 * the community pocket (the records), never part of it, so a gap is visible.
 */
export function AccountsPage({ embedded = false }: { embedded?: boolean }) {
  const { communityId, can } = useWorkspace();
  const canManage = can('finance.account.manage');
  const accounts = useAccounts(communityId);
  const wallet = useCashFlow(communityId, THIS_MONTH, THIS_MONTH);
  const [notice, setNotice] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [entering, setEntering] = useState<Account | null>(null);
  const [renaming, setRenaming] = useState<Account | null>(null);
  const [history, setHistory] = useState<Account | null>(null);

  const active = (accounts.data?.items ?? []).filter((a) => a.is_active);
  const retired = (accounts.data?.items ?? []).filter((a) => !a.is_active);
  const withBalance = active.filter((a) => a.balance_minor !== null);
  const total = withBalance.reduce((sum, a) => sum + (a.balance_minor ?? 0), 0);
  const walletMinor = wallet.data?.wallet_balance_minor;
  const gap = walletMinor === undefined || withBalance.length === 0 ? null : total - walletMinor;

  return (
    <div className="page">
      <SectionHeader
        embedded={embedded}
        eyebrow={<span className="eyebrow eyebrow--muted">Treasury</span>}
        title="Bank & MoMo Accounts"
        subtitle="Where the community's money actually sits, with the balance the Treasurer last read for each."
        actions={
          canManage && (
            <Button inline icon={<IconPlus />} onClick={() => setAdding(true)}>
              Add account
            </Button>
          )
        }
      />

      {notice && <SuccessNotice text={notice} />}

      {accounts.data === undefined ? (
        accounts.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState message={errorMessage(accounts.error)} />
        )
      ) : (
        <>
          <section className="card accounts-check" aria-label="Accounts against the records">
            <div>
              <p className="kpi__label">In the accounts</p>
              <p className="kpi__value">RWF {formatAmount(total)}</p>
            </div>
            <div>
              <p className="kpi__label">In the records (community pocket)</p>
              <p className="kpi__value">
                {walletMinor === undefined ? '…' : `RWF ${formatAmount(walletMinor)}`}
              </p>
            </div>
            <div>
              <p className="kpi__label">Difference</p>
              <p className="kpi__value">
                {gap === null
                  ? '—'
                  : gap === 0
                    ? 'They match'
                    : `RWF ${formatAmount(Math.abs(gap))}`}
              </p>
              {gap !== null && gap !== 0 && (
                <p className="kpi__note">
                  {gap > 0
                    ? 'The accounts hold more than the records say.'
                    : 'The accounts hold less than the records say. Check for unrecorded expenses.'}
                </p>
              )}
            </div>
          </section>

          {active.length === 0 ? (
            <section className="card">
              <EmptyState
                icon={<IconInstitution />}
                title="No accounts yet"
                message="Add the community's bank account, MoMo number or cash box, then enter what each holds."
              />
            </section>
          ) : (
            <ul className="account-cards" role="list">
              {active.map((account) => (
                <li key={account.id} className="card account-card">
                  <div className="account-card__head">
                    <IconTile tone={account.kind === 'mobile_money' ? 'warning' : 'info'}>
                      {account.kind === 'mobile_money' ? <IconPhone /> : <IconInstitution />}
                    </IconTile>
                    <div>
                      <h3 className="account-card__name">{account.name}</h3>
                      <p className="table__muted">{KIND_LABEL[account.kind]}</p>
                    </div>
                  </div>
                  <p className="account-card__balance">
                    {account.balance_minor === null ? (
                      <span className="table__muted">No balance entered yet</span>
                    ) : (
                      <>
                        {formatAmount(account.balance_minor)}{' '}
                        <span className="money__unit">{account.currency}</span>
                      </>
                    )}
                  </p>
                  {account.latest_balance && (
                    <p className="table__muted">
                      As of {formatDate(account.latest_balance.as_of)}
                      {account.latest_balance.entered_by &&
                        ` · entered by ${account.latest_balance.entered_by.full_name}`}
                      {account.latest_balance.note && ` · ${account.latest_balance.note}`}
                    </p>
                  )}
                  <div className="review-actions">
                    {canManage && (
                      <Button
                        size="sm"
                        inline
                        icon={<IconWallet />}
                        onClick={() => setEntering(account)}
                      >
                        Enter balance
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      inline
                      icon={<IconHistory />}
                      onClick={() => setHistory(account)}
                    >
                      History
                    </Button>
                    {canManage && (
                      <Button
                        variant="tint"
                        size="sm"
                        inline
                        icon={<IconPencil />}
                        onClick={() => setRenaming(account)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {retired.length > 0 && (
            <p className="table__muted">
              Retired: {retired.map((a) => a.name).join(', ')}. Their history is kept.
            </p>
          )}
        </>
      )}

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add account"
        subtitle="A bank account, MoMo number or cash box the community keeps money in."
        icon={
          <IconTile tone="brand" round>
            <IconInstitution />
          </IconTile>
        }
      >
        {adding && (
          <AccountForm
            account={null}
            onClose={() => setAdding(false)}
            onSaved={(m) => {
              setAdding(false);
              setNotice(m);
            }}
          />
        )}
      </Dialog>

      <Dialog
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title="Edit account"
        subtitle="Rename it, change its kind, or retire it once it is closed."
        icon={
          <IconTile tone="brand" round>
            <IconPencil />
          </IconTile>
        }
      >
        {renaming && (
          <AccountForm
            account={renaming}
            onClose={() => setRenaming(null)}
            onSaved={(m) => {
              setRenaming(null);
              setNotice(m);
            }}
          />
        )}
      </Dialog>

      <Dialog
        open={entering !== null}
        onClose={() => setEntering(null)}
        title="Enter balance"
        subtitle={
          entering ? `What ${entering.name} holds, as you read it on a statement or phone.` : ''
        }
        icon={
          <IconTile tone="brand" round>
            <IconWallet />
          </IconTile>
        }
      >
        {entering && (
          <BalanceForm
            account={entering}
            onClose={() => setEntering(null)}
            onSaved={(m) => {
              setEntering(null);
              setNotice(m);
            }}
          />
        )}
      </Dialog>

      <Drawer
        open={history !== null}
        onClose={() => setHistory(null)}
        label={history ? `${history.name} balance history` : 'Balance history'}
      >
        {history && <BalanceHistory account={history} />}
      </Drawer>
    </div>
  );
}

function AccountForm({
  account,
  onClose,
  onSaved,
}: {
  account: Account | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const create = useCreateAccount();
  const update = useUpdateAccount();
  const retire = useRetireAccount();
  const [name, setName] = useState(account?.name ?? '');
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? 'bank');
  const [balance, setBalance] = useState('');
  const [asOf, setAsOf] = useState(today());
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const busy = create.isPending || update.isPending || retire.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim() === '') {
      setErrors({ name: 'Give the account a name, e.g. Bank of Kigali.' });
      return;
    }
    if (!communityId) return;
    const onError = (error: unknown) => {
      const f = error instanceof ApiError ? error.fieldErrors : {};
      setErrors({
        name: f.name,
        balance: f.balance_minor,
        as_of: f.as_of,
        form: f.name || f.balance_minor || f.as_of ? undefined : errorMessage(error),
      });
    };
    if (account) {
      update.mutate(
        { communityId, accountId: account.id, name: name.trim(), kind },
        { onSuccess: () => onSaved(`${name.trim()} saved.`), onError },
      );
    } else {
      create.mutate(
        {
          communityId,
          name: name.trim(),
          kind,
          ...(balance.trim() !== ''
            ? { balance_minor: Math.round(Number(balance) * MINOR_PER_MAJOR), as_of: asOf }
            : {}),
        },
        { onSuccess: () => onSaved(`${name.trim()} added.`), onError },
      );
    }
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      <Input
        label="Name"
        placeholder="e.g. Bank of Kigali, MTN MoMo 078…"
        maxLength={80}
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
        required
      />
      <Select
        label="Kind"
        value={kind}
        onChange={(event) => setKind(event.target.value as AccountKind)}
        options={KINDS}
      />
      {!account && (
        <div className="form-row">
          <Input
            label="Balance now (RWF)"
            optional
            type="number"
            step="any"
            value={balance}
            onChange={(event) => setBalance(event.target.value)}
            error={errors.balance}
          />
          <Input
            label="As of"
            type="date"
            max={today()}
            value={asOf}
            onChange={(event) => setAsOf(event.target.value)}
            error={errors.as_of}
          />
        </div>
      )}
      {errors.form && <p className="form-error">{errors.form}</p>}
      <div className="dialog__footer dialog__footer--flush">
        {account && (
          <Button
            variant="danger"
            disabled={busy}
            onClick={() =>
              communityId &&
              retire.mutate(
                { communityId, accountId: account.id },
                {
                  onSuccess: () => onSaved(`${account.name} retired. Its history is kept.`),
                  onError: (error) => setErrors({ form: errorMessage(error) }),
                },
              )
            }
          >
            Retire
          </Button>
        )}
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : account ? 'Save' : 'Add account'}
        </Button>
      </div>
    </form>
  );
}

function BalanceForm({
  account,
  onClose,
  onSaved,
}: {
  account: Account;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const enter = useEnterBalance();
  const [balance, setBalance] = useState('');
  const [asOf, setAsOf] = useState(today());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (balance.trim() === '' || !Number.isFinite(Number(balance))) {
      setErrors({ balance: 'Enter what the account holds (it may be negative for an overdraft).' });
      return;
    }
    if (!communityId) return;
    enter.mutate(
      {
        communityId,
        accountId: account.id,
        balance_minor: Math.round(Number(balance) * MINOR_PER_MAJOR),
        as_of: asOf,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () =>
          onSaved(
            `${account.name}: ${formatAmount(Math.round(Number(balance) * MINOR_PER_MAJOR))} RWF as of ${formatDate(asOf)}.`,
          ),
        onError: (error) => {
          const f = error instanceof ApiError ? error.fieldErrors : {};
          setErrors({
            balance: f.balance_minor,
            as_of: f.as_of,
            form: f.balance_minor || f.as_of ? undefined : errorMessage(error),
          });
        },
      },
    );
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      <div className="form-row">
        <Input
          label="Balance (RWF)"
          type="number"
          step="any"
          value={balance}
          onChange={(event) => setBalance(event.target.value)}
          error={errors.balance}
          required
        />
        <Input
          label="As of"
          type="date"
          max={today()}
          value={asOf}
          onChange={(event) => setAsOf(event.target.value)}
          error={errors.as_of}
          required
        />
      </div>
      <Input
        label="Note"
        optional
        placeholder="e.g. October statement"
        maxLength={255}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      {errors.form && <p className="form-error">{errors.form}</p>}
      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={enter.isPending}>
          {enter.isPending ? 'Saving…' : 'Save balance'}
        </Button>
      </div>
    </form>
  );
}

function BalanceHistory({ account }: { account: Account }) {
  const { communityId } = useWorkspace();
  const balances = useAccountBalances(communityId, account.id);
  return (
    <section className="details" aria-labelledby="history-title">
      <header className="details__head">
        <div>
          <p className="section-head__eyebrow">{KIND_LABEL[account.kind]}</p>
          <h2 id="history-title" className="section-head__title">
            {account.name}
          </h2>
          <p className="section-head__subtitle">Every balance entered, newest first.</p>
        </div>
        {!account.is_active && <Badge tone="neutral">Retired</Badge>}
      </header>
      {balances.data === undefined ? (
        balances.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState message={errorMessage(balances.error)} />
        )
      ) : balances.data.items.length === 0 ? (
        <EmptyState icon={<IconHistory />} title="No balances yet" message="Enter the first one." />
      ) : (
        <table className="table table--compact">
          <thead>
            <tr>
              <th scope="col">As of</th>
              <th scope="col" className="statement-table__num">
                Balance (RWF)
              </th>
              <th scope="col">Entered by</th>
            </tr>
          </thead>
          <tbody>
            {balances.data.items.map((b) => (
              <tr key={b.id}>
                <td>
                  {formatDate(b.as_of)}
                  {b.note && <span className="table__muted"> · {b.note}</span>}
                </td>
                <td className="statement-table__num">{formatAmount(b.balance_minor)}</td>
                <td>{b.entered_by?.full_name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
