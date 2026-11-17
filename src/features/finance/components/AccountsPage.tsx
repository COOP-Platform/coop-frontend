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
  StatCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import {
  useAccountBalances,
  useAccountMovements,
  useAccounts,
  useAddMovement,
  useCreateAccount,
  useEnterBalance,
  useRetireAccount,
  useUpdateAccount,
} from '../api/accounts';
import type { Account, AccountKind, MovementDirection } from '../api/accounts';
import { useCashFlow } from '../api/cashflow';
import { MINOR_PER_MAJOR, formatAmount } from '../format';
import { THIS_MONTH } from '../month';
import { SuccessNotice } from './SuccessNotice';
import { Money } from './Money';
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

/** What the number is called for each kind; a cash box has none. */
const NUMBER_LABEL: Record<AccountKind, string | null> = {
  bank: 'Account number',
  mobile_money: 'MoMo number',
  cash: null,
  other: 'Number or reference',
};

/**
 * Where the money actually sits: the bank, MoMo number and cash box. Each
 * balance starts from the last one the Treasurer typed in, then moves on its
 * own: confirmed contributions paid into the account add to it, and money
 * put in or taken out by hand moves it. Shown next to the community pocket
 * (the records), never part of it, so a gap is visible.
 */
export function AccountsPage({ embedded = false }: { embedded?: boolean }) {
  const { communityId, can } = useWorkspace();
  const canManage = can('finance.account.manage');
  const accounts = useAccounts(communityId);
  const wallet = useCashFlow(communityId, THIS_MONTH, THIS_MONTH);
  const [notice, setNotice] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [entering, setEntering] = useState<Account | null>(null);
  const [moving, setMoving] = useState<Account | null>(null);
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
        title="Bank & MoMo"
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
          <section className="stat-grid" aria-label="Accounts against the records">
            <StatCard
              label="In the accounts"
              value={<Money minor={total} />}
              caption={`${withBalance.length} account${withBalance.length === 1 ? '' : 's'}`}
              icon={<IconInstitution />}
              tone="info"
            />
            <StatCard
              label="In the records"
              value={walletMinor === undefined ? '…' : <Money minor={walletMinor} />}
              caption="Community pocket"
              icon={<IconWallet />}
              tone="brand"
            />
            <StatCard
              label="Difference"
              value={
                gap === null ? '—' : gap === 0 ? 'They match' : <Money minor={Math.abs(gap)} />
              }
              caption={
                gap === null || gap === 0 ? undefined : (
                  <b className="caption-warn">
                    {gap > 0 ? 'Accounts hold more' : 'Accounts hold less'}
                  </b>
                )
              }
              icon={<IconHistory />}
              tone={gap !== null && gap !== 0 ? 'warning' : 'neutral'}
              emphasis={gap !== null && gap !== 0}
            />
          </section>

          {active.length === 0 ? (
            <section className="card">
              <EmptyState icon={<IconInstitution />} title="No accounts yet" />
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
                      <p className="table__muted">
                        {KIND_LABEL[account.kind]}
                        {account.number && (
                          <>
                            {' · '}
                            <span className="mono">{account.number}</span>
                          </>
                        )}
                      </p>
                      {account.holder_name && <p className="table__muted">{account.holder_name}</p>}
                    </div>
                  </div>
                  <p className="account-card__balance">
                    {account.balance_minor === null ? (
                      <span className="table__muted">No balance yet</span>
                    ) : (
                      <>
                        {formatAmount(account.balance_minor)}{' '}
                        <span className="money__unit">{account.currency}</span>
                      </>
                    )}
                  </p>
                  <BalanceBreakdown account={account} />
                  <div className="review-actions">
                    {canManage && (
                      <Button
                        size="sm"
                        inline
                        icon={<IconPlus />}
                        onClick={() => setMoving(account)}
                      >
                        Money in / out
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        size="sm"
                        inline
                        variant="secondary"
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
            <p className="table__muted">Retired: {retired.map((a) => a.name).join(', ')}</p>
          )}
        </>
      )}

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add account"
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
        subtitle={entering?.name}
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

      <Dialog
        open={moving !== null}
        onClose={() => setMoving(null)}
        title="Money in / out"
        subtitle={moving?.name}
        icon={
          <IconTile tone="brand" round>
            <IconPlus />
          </IconTile>
        }
      >
        {moving && (
          <MoveForm
            account={moving}
            onClose={() => setMoving(null)}
            onSaved={(m) => {
              setMoving(null);
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
  const [number, setNumber] = useState(account?.number ?? '');
  const [holder, setHolder] = useState(account?.holder_name ?? '');
  const numberLabel = NUMBER_LABEL[kind];
  // Members need it to send money: required for a bank account and a MoMo number.
  const numberRequired = kind === 'bank' || kind === 'mobile_money';
  const [balance, setBalance] = useState('');
  const [asOf, setAsOf] = useState(today());
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const busy = create.isPending || update.isPending || retire.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: Record<string, string> = {};
    if (name.trim() === '') problems.name = 'Give the account a name, e.g. Bank of Kigali.';
    if (numberRequired && number.trim() === '')
      problems.number = `Enter the ${numberLabel?.toLowerCase() ?? 'number'} members send money to.`;
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    if (!communityId) return;
    const onError = (error: unknown) => {
      const f = error instanceof ApiError ? error.fieldErrors : {};
      setErrors({
        name: f.name,
        number: f.number,
        holder: f.holder_name,
        balance: f.balance_minor,
        as_of: f.as_of,
        form:
          f.name || f.number || f.holder_name || f.balance_minor || f.as_of
            ? undefined
            : errorMessage(error),
      });
    };
    const details = {
      // A cash box has no number.
      number: numberLabel ? number.trim() : '',
      holder_name: holder.trim(),
    };
    if (account) {
      update.mutate(
        { communityId, accountId: account.id, name: name.trim(), kind, ...details },
        { onSuccess: () => onSaved(`${name.trim()} saved.`), onError },
      );
    } else {
      create.mutate(
        {
          communityId,
          name: name.trim(),
          kind,
          ...(details.number ? { number: details.number } : {}),
          ...(details.holder_name ? { holder_name: details.holder_name } : {}),
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
        placeholder="e.g. Bank of Kigali, MTN MoMo"
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
      {numberLabel && (
        <div className="form-row">
          <Input
            label={numberLabel}
            optional={!numberRequired}
            required={numberRequired}
            inputMode={kind === 'mobile_money' ? 'tel' : undefined}
            placeholder={kind === 'mobile_money' ? 'e.g. 078 123 4567' : 'e.g. 0001-2345-6789'}
            maxLength={64}
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            error={errors.number}
          />
          <Input
            label="Registered name"
            optional
            placeholder="e.g. Les Cousins Family"
            maxLength={120}
            value={holder}
            onChange={(event) => setHolder(event.target.value)}
            error={errors.holder}
          />
        </div>
      )}
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
                  onSuccess: () => onSaved(`${account.name} retired.`),
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
      setErrors({ balance: 'Enter the balance (negative for an overdraft).' });
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

/** How the balance is made up: what was typed in, then what came since. */
function BalanceBreakdown({ account }: { account: Account }) {
  const lines: string[] = [];
  if (account.latest_balance) {
    lines.push(
      `${formatAmount(account.latest_balance.balance_minor)} on ${formatDate(account.latest_balance.as_of)}`,
    );
  }
  if (account.contributions_since_minor !== 0)
    lines.push(`+ ${formatAmount(account.contributions_since_minor)} payments`);
  if (account.movements_since_minor > 0)
    lines.push(`+ ${formatAmount(account.movements_since_minor)} by hand`);
  if (account.movements_since_minor < 0)
    lines.push(`− ${formatAmount(-account.movements_since_minor)} by hand`);
  if (lines.length === 0) return null;
  return (
    <ul
      className="account-card__breakdown"
      aria-label={`How the ${account.name} balance is made up`}
    >
      {lines.map((line) => (
        <li key={line} className="table__muted">
          {line}
        </li>
      ))}
    </ul>
  );
}

function MoveForm({
  account,
  onClose,
  onSaved,
}: {
  account: Account;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const move = useAddMovement();
  const [direction, setDirection] = useState<MovementDirection>('in');
  const [amount, setAmount] = useState('');
  const [on, setOn] = useState(today());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minor = Math.round(Number(amount) * MINOR_PER_MAJOR);
    if (amount.trim() === '' || !Number.isFinite(minor) || minor <= 0) {
      setErrors({ amount: 'Enter an amount more than 0.' });
      return;
    }
    if (!communityId) return;
    move.mutate(
      {
        communityId,
        accountId: account.id,
        direction,
        amount_minor: minor,
        on,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () =>
          onSaved(
            `${formatAmount(minor)} RWF ${direction === 'in' ? 'added to' : 'taken out of'} ${account.name}.`,
          ),
        onError: (error) => {
          const f = error instanceof ApiError ? error.fieldErrors : {};
          setErrors({
            amount: f.amount_minor,
            on: f.on,
            form: f.amount_minor || f.on ? undefined : errorMessage(error),
          });
        },
      },
    );
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      <Select
        label="What happened?"
        value={direction}
        onChange={(event) => setDirection(event.target.value as MovementDirection)}
        options={[
          { value: 'in', label: 'Money put in' },
          { value: 'out', label: 'Money taken out' },
        ]}
      />
      <div className="form-row">
        <Input
          label="Amount (RWF)"
          type="number"
          min="1"
          step="any"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={errors.amount}
          required
        />
        <Input
          label="Date"
          type="date"
          max={today()}
          value={on}
          onChange={(event) => setOn(event.target.value)}
          error={errors.on}
          required
        />
      </div>
      <Input
        label="Note"
        optional
        placeholder="e.g. Cash collected at the November meeting"
        maxLength={255}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      {errors.form && <p className="form-error">{errors.form}</p>}
      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={move.isPending}>
          {move.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

function BalanceHistory({ account }: { account: Account }) {
  const { communityId } = useWorkspace();
  const balances = useAccountBalances(communityId, account.id);
  const movements = useAccountMovements(communityId, account.id);
  return (
    <section className="details" aria-labelledby="history-title">
      <header className="details__head">
        <h2 id="history-title" className="section-head__title">
          {account.name}
        </h2>
        {!account.is_active && <Badge tone="neutral">Retired</Badge>}
      </header>
      {balances.data === undefined ? (
        balances.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState message={errorMessage(balances.error)} />
        )
      ) : balances.data.items.length === 0 ? (
        <p className="table__muted">None yet</p>
      ) : (
        <div className="table-scroll">
          <table className="table table--compact">
            <thead>
              <tr>
                <th scope="col">As of</th>
                <th scope="col" className="num">
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
                  <td className="num">{formatAmount(b.balance_minor)}</td>
                  <td>{b.entered_by?.full_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="section-head__title account-history__title">In / out by hand</h3>
      {movements.data === undefined ? (
        movements.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState message={errorMessage(movements.error)} />
        )
      ) : movements.data.items.length === 0 ? (
        <p className="table__muted">None yet</p>
      ) : (
        <div className="table-scroll">
          <table className="table table--compact">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col" className="num">
                  Amount (RWF)
                </th>
                <th scope="col">Entered by</th>
              </tr>
            </thead>
            <tbody>
              {movements.data.items.map((m) => (
                <tr key={m.id}>
                  <td>
                    {formatDate(m.on)}
                    {m.note && <span className="table__muted"> · {m.note}</span>}
                  </td>
                  <td className="num">
                    {m.direction === 'in' ? '+' : '−'} {formatAmount(m.amount_minor)}
                  </td>
                  <td>{m.entered_by?.full_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
