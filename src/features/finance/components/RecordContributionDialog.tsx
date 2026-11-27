import type { FormEvent } from 'react';
import { useState } from 'react';

import { Button, Dialog, IconPlusCircle, IconTile, Input, Select } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { useMemberships } from '@/features/members';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import { useChannels } from '../api/accounts';
import { useMemberArrears, useMyArrears } from '../api/arrears';
import { useFinancialYears } from '../api/years';
import type { ArrearsMonth } from '../api/arrears';
import type { Account } from '../api/accounts';
import { useMyFines } from '../api/fines';
import { FINES_ENABLED } from '../features';
import { useOpenCampaigns, useRecordContribution } from '../api/my-contributions';
import type { ContributionDetail, MyContributions } from '../api/my-contributions';
import { useShareCategories } from '../api/shares';
import type { ContributionType, PaymentMethod } from '../api/types';
import { MINOR_PER_MAJOR, formatAmount } from '../format';
import { FilePicker } from './FilePicker';
import { METHOD_LABEL, TYPE_LABEL, periodLabel } from '../labels';

/**
 * What a payment can be for: the monthly contribution (which settles any
 * ibirarane first, on its own) or an event's contribution while one is open.
 */
const TYPE_ORDER: ContributionType[] = [
  'monthly',
  'dedicated',
  ...(FINES_ENABLED ? (['fine'] as const) : []),
];

/** A month's "Pay" from the Ibirarane list is a monthly payment for that month. */
const startType = (type: ContributionType | undefined): ContributionType =>
  type === undefined || type === 'arrears' ? 'monthly' : type;
const METHOD_ORDER: PaymentMethod[] = ['mobile_money', 'bank_transfer', 'cash'];

const pad = (n: number) => String(n).padStart(2, '0');
const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toIsoMonth = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/** Whole RWF for an input: 1000000 minor -> "10000". */
const toInput = (minor: number | null | undefined) =>
  minor ? String(minor / MINOR_PER_MAJOR) : '';

/** The channel a payment method usually lands in, to suggest one. */
const KIND_FOR_METHOD: Record<PaymentMethod, Account['kind']> = {
  mobile_money: 'mobile_money',
  bank_transfer: 'bank',
  cash: 'cash',
};

function suggestChannel(channels: Account[], method: PaymentMethod): string {
  if (channels.length === 1) return channels[0]?.id ?? '';
  return channels.find((c) => c.kind === KIND_FOR_METHOD[method])?.id ?? '';
}

interface Piece {
  year: number;
  month: number;
  amount: number;
  /** A month not due yet, paid in advance. */
  ahead: boolean;
}

/** "2026-03" -> [2026, 3]. */
const periodParts = (period: string): [number, number] => {
  const [y = 0, m = 0] = period.split('-').map(Number);
  return [y, m];
};

const nextMonth = (y: number, m: number): [number, number] => (m === 12 ? [y + 1, 1] : [y, m + 1]);
const before = (a: [number, number], b: [number, number]) =>
  a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);

/**
 * Where a monthly payment goes, as the backend splits it (settle_arrears,
 * finance/arrears.py): (1) the oldest unpaid months up to the month chosen,
 * each what is left after anything pending; (2) the month chosen, one
 * month's worth, when it is still ahead; (3) the rest pays the following
 * months in advance, one month's worth each. Months in a closed financial
 * year are skipped throughout. A preview only: the server decides, and it
 * also skips months already paid ahead.
 */
function planPayment(
  months: readonly ArrearsMonth[],
  amount: number,
  period: string,
  perMonth: number | undefined,
  today: Date,
  closedYears: ReadonlySet<number>,
): Piece[] {
  const [year = 0, month = 0] = period.split('-').map(Number);
  const chosen: [number, number] = [year, month];
  const now: [number, number] = [today.getFullYear(), today.getMonth() + 1];
  const pieces: Piece[] = [];
  const has = (y: number, m: number) => pieces.some((p) => p.year === y && p.month === m);
  let left = amount;

  // 1) Ibirarane, oldest first, up to the month chosen.
  for (const m of months) {
    if (left <= 0) break;
    const free = m.remaining_minor - m.pending_minor;
    if (free <= 0 || m.record_as === null || before(chosen, [m.year, m.month])) continue;
    if (closedYears.has(m.year)) continue;
    const piece = Math.min(left, free);
    pieces.push({ year: m.year, month: m.month, amount: piece, ahead: false });
    left -= piece;
  }

  // Without a known monthly amount, the rest stays on the month chosen.
  if (!perMonth || perMonth <= 0) {
    if (left > 0) {
      const mine = pieces.find((p) => p.year === year && p.month === month);
      if (mine) mine.amount += left;
      else pieces.push({ year, month, amount: left, ahead: before(now, chosen) });
    }
    return pieces;
  }

  // 2) The month chosen, when it is still ahead.
  const owed = new Set(months.map((m) => `${m.year}-${m.month}`));
  if (left > 0 && before(now, chosen) && !owed.has(`${year}-${month}`) && !closedYears.has(year)) {
    const piece = Math.min(left, perMonth);
    pieces.push({ year, month, amount: piece, ahead: true });
    left -= piece;
  }

  // 3) The rest pays the months after it, ahead.
  let [y, m] = chosen;
  for (let i = 0; i < 120 && left > 0; i += 1) {
    [y, m] = nextMonth(y, m);
    if (has(y, m) || closedYears.has(y)) continue;
    const piece = Math.min(left, perMonth);
    pieces.push({ year: y, month: m, amount: piece, ahead: before(now, [y, m]) });
    left -= piece;
  }
  return pieces;
}

/** Longer than this, the preview shows ranges instead of every month. */
const LONG_PLAN = 8;

interface PlanRow {
  key: string;
  label: string;
  amount: number;
  ahead: boolean;
}

const onePiece = (p: Piece): PlanRow => ({
  key: `${p.year}-${p.month}`,
  label: periodLabel(p.year, p.month),
  amount: p.amount,
  ahead: p.ahead,
});

/** "September 2022 – June 2026 · 32 months", then the same for months ahead. */
function summarise(plan: readonly Piece[]): PlanRow[] {
  return [false, true].flatMap((ahead) => {
    const part = plan.filter((p) => p.ahead === ahead);
    const first = part[0];
    const last = part[part.length - 1];
    if (!first || !last) return [];
    const range =
      part.length === 1
        ? periodLabel(first.year, first.month)
        : `${periodLabel(first.year, first.month)} – ${periodLabel(last.year, last.month)}`;
    return [
      {
        key: ahead ? 'ahead' : 'owed',
        label: `${range} · ${part.length} month${part.length === 1 ? '' : 's'}`,
        amount: part.reduce((sum, p) => sum + p.amount, 0),
        ahead,
      },
    ];
  });
}

interface Errors {
  account_id?: string;
  membership_id?: string;
  contribution_type?: string;
  campaign_id?: string;
  fine_id?: string;
  period?: string;
  amount?: string;
  paid_at?: string;
  payment_method?: string;
  payment_reference?: string;
  proof?: string;
  form?: string;
}

interface RecordContributionDialogProps {
  open: boolean;
  onClose: () => void;
  /** The member's shares, for the amount a month costs them. */
  shares: MyContributions['shares'] | undefined;
  onRecorded: (contribution: ContributionDetail) => void;
  /** Start filled in, e.g. "pay this unpaid month" from the arrears list. */
  initial?: RecordInitial;
  /**
   * Opened to record someone else's payment (needs
   * finance.contribution.record_for_member): "Who paid?" starts unchosen.
   */
  forMember?: boolean;
}

export interface RecordInitial {
  type: ContributionType;
  /** `YYYY-MM`. */
  period?: string;
  amountMinor?: number;
  /** For a dedicated payment: the contribution it goes to. */
  campaignId?: string;
  /** For a fine payment: the fine it pays. */
  fineId?: string;
}

/**
 * A member records a payment they made and attaches the proof (a MoMo
 * screenshot, a bank slip). It is saved as "Pending review" and the
 * Treasurer confirms or rejects it.
 */
export function RecordContributionDialog({
  open,
  onClose,
  shares,
  onRecorded,
  initial,
  forMember = false,
}: RecordContributionDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={forMember ? 'Record a payment for a member' : 'Record Contribution'}
      subtitle={
        forMember
          ? 'Pending until someone else confirms it.'
          : 'Pending until the Treasurer confirms it.'
      }
      icon={
        <IconTile tone="brand" round>
          <IconPlusCircle />
        </IconTile>
      }
    >
      {/* Mounted only while open, so every opening starts from a clean form. */}
      {open && (
        <RecordContributionForm
          onClose={onClose}
          shares={shares}
          onRecorded={onRecorded}
          initial={initial}
          forMember={forMember}
        />
      )}
    </Dialog>
  );
}

function RecordContributionForm({
  onClose,
  shares,
  onRecorded,
  initial,
  forMember = false,
}: Omit<RecordContributionDialogProps, 'open'>) {
  const { communityId, can, membership } = useWorkspace();
  const record = useRecordContribution();
  const campaigns = useOpenCampaigns(communityId, true);
  const openCampaigns = campaigns.data?.items ?? [];

  // "Who paid?": the Treasurer may record a payment on a member's behalf (needs both rights).
  const canPickMember =
    can('finance.contribution.record') && can('finance.contribution.record_for_member');
  const members = useMemberships(canPickMember ? communityId : undefined, 'active');
  const categories = useShareCategories(canPickMember ? communityId : undefined);
  const [who, setWho] = useState<string>(canPickMember && forMember ? '' : 'me');
  const forOther = who !== 'me';
  const others = (members.data ?? []).filter((m) => m.id !== membership?.id);
  const payer = others.find((m) => m.id === who);
  /** What a member's shares come to a month, when their category is known. */
  const owedPerMonth = (memberId: string | undefined) => {
    const m = (members.data ?? []).find((row) => row.id === memberId);
    const category = categories.data?.items.find((c) => c.id === m?.member_category);
    return m && category ? category.share_price_minor * (m.shares ?? 1) : undefined;
  };

  // Fines still to pay, for "which fine is this for?" (your own fines only).
  const myFines = useMyFines(communityId);
  const openFines = (forOther ? [] : (myFines.data?.items ?? [])).filter(
    (f) => f.status === 'issued' && f.outstanding_minor > 0,
  );

  const today = new Date();
  const monthly = forOther
    ? owedPerMonth(who)
    : (shares?.owed_per_month_minor ?? owedPerMonth(membership?.id));
  const [type, setType] = useState<ContributionType>(startType(initial?.type));
  const [campaignId, setCampaignId] = useState(initial?.campaignId ?? '');
  const [fineId, setFineId] = useState(initial?.fineId ?? '');
  const [amount, setAmount] = useState(toInput(initial?.amountMinor ?? monthly));
  const [paidAt, setPaidAt] = useState(toIsoDate(today));
  // The month is not asked any more: the server takes the month of the date
  // paid and settles the oldest unpaid months first. Only a "Pay" from the
  // Ibirarane list names one month on purpose.
  const [chosenPeriod, setPeriod] = useState<string | null>(initial?.period ?? null);
  const period = chosenPeriod ?? (paidAt === '' ? toIsoMonth(today) : paidAt.slice(0, 7));
  const [method, setMethod] = useState<PaymentMethod>('mobile_money');
  const channels = useChannels(communityId);
  // Suggested from the payment method until the payer picks one themselves.
  const [pickedChannel, setPickedChannel] = useState<string | null>(null);
  const channel = pickedChannel ?? suggestChannel(channels, method);
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  const hasPeriod = type === 'monthly' || type === 'arrears';
  const typeOptions = TYPE_ORDER.filter((t) => t !== 'dedicated' || openCampaigns.length > 0).map(
    (t) => ({
      value: t,
      label: t === 'dedicated' ? 'Event contribution' : TYPE_LABEL[t],
    }),
  );

  // Ibirarane first: a monthly payment pays the oldest unpaid months before
  // the month chosen. Another member's months need the right to see them.
  const myArrears = useMyArrears(forOther ? undefined : communityId);
  const seeTheirs = forOther && who !== '' && can('finance.contribution.confirm');
  const theirArrears = useMemberArrears(
    seeTheirs ? communityId : undefined,
    seeTheirs ? who : undefined,
  );
  const unpaid = (forOther ? theirArrears.data : myArrears.data)?.months ?? [];
  // Closed financial years take no new money: the backend skips them too.
  const financialYears = useFinancialYears(communityId);
  const closedYears = new Set(
    (financialYears.data?.items ?? []).filter((y) => y.status === 'closed').map((y) => y.year),
  );
  const settles = type === 'monthly';
  const [periodYear = 0, periodMonth = 0] = period.split('-').map(Number);
  const isChosen = (m: ArrearsMonth) => m.year === periodYear && m.month === periodMonth;
  const isBefore = (m: ArrearsMonth) =>
    m.year < periodYear || (m.year === periodYear && m.month < periodMonth);
  const freeOn = (m: ArrearsMonth) =>
    m.record_as === null || closedYears.has(m.year)
      ? 0
      : Math.max(0, m.remaining_minor - m.pending_minor);
  // Ibirarane: what is still owed for the months before the one chosen.
  const owedUpToPeriod = unpaid.filter(isBefore).reduce((sum, m) => sum + freeOn(m), 0);
  const chosenMonth = unpaid.find(isChosen);
  // Everything owed: the ibirarane plus what the chosen month still needs.
  const payAllMinor = owedUpToPeriod + (chosenMonth ? freeOn(chosenMonth) : (monthly ?? 0));
  const amountMinor = Math.round(Number(amount) * MINOR_PER_MAJOR);
  const plan =
    settles && amountMinor > 0
      ? planPayment(unpaid, amountMinor, period, monthly, today, closedYears)
      : [];
  // Shown when the payment is split: ibirarane to clear, or months paid ahead.
  const showPlan = settles && (owedUpToPeriod > 0 || plan.length > 1);
  const aheadMinor = plan.filter((p) => p.ahead).reduce((sum, p) => sum + p.amount, 0);

  function changeType(next: ContributionType) {
    setType(next);
    setErrors({});
    if (next === 'monthly' || next === 'arrears') {
      setPeriod(null);
      setAmount(toInput(monthly));
    } else if (next === 'dedicated') {
      const first = openCampaigns[0];
      setCampaignId(first?.id ?? '');
      setAmount(
        forOther ? '' : toInput(first?.my_share.outstanding_minor ?? first?.my_share.owed_minor),
      );
    } else if (next === 'fine' && openFines.length > 0) {
      changeFine(openFines[0]?.id ?? '');
    } else {
      setAmount('');
    }
  }

  function changeFine(id: string) {
    setFineId(id);
    const fine = openFines.find((f) => f.id === id);
    setAmount(toInput(fine ? Math.max(fine.outstanding_minor - fine.pending_minor, 0) : 0));
  }

  function changeCampaign(id: string) {
    setCampaignId(id);
    const campaign = openCampaigns.find((c) => c.id === id);
    // What is left to pay is yours; for another member, leave the amount to the recorder.
    setAmount(
      forOther
        ? ''
        : toInput(campaign?.my_share.outstanding_minor ?? campaign?.my_share.owed_minor),
    );
  }

  /** A different payer starts the form again: no arrears or fine prefill carries over. */
  function changeWho(next: string) {
    setWho(next);
    setErrors({});
    setType('monthly');
    setPeriod(null);
    setCampaignId('');
    setFineId('');
    setAmount(
      toInput(
        next === 'me'
          ? (shares?.owed_per_month_minor ?? owedPerMonth(membership?.id))
          : owedPerMonth(next),
      ),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: Errors = {};
    if (who === '') problems.membership_id = 'Choose who paid.';
    if (amount.trim() === '' || !Number.isFinite(amountMinor) || amountMinor <= 0)
      problems.amount = 'Enter the amount you paid, more than 0.';
    if (paidAt === '') problems.paid_at = 'Enter the day you paid.';
    else if (paidAt > toIsoDate(today))
      problems.paid_at = 'The payment date cannot be in the future.';
    if (type === 'dedicated' && campaignId === '')
      problems.campaign_id = 'Choose the dedicated contribution you paid into.';
    if (type === 'fine' && openFines.length > 0 && fineId === '')
      problems.fine_id = 'Choose the fine you paid.';
    if (channels.length > 0 && channel === '') problems.account_id = 'Choose where the money went.';
    setErrors(problems);
    if (Object.keys(problems).length > 0 || communityId === undefined) return;

    const [year, month] = period.split('-').map(Number);
    record.mutate(
      {
        communityId,
        ...(forOther ? { membership_id: who } : {}),
        amount_minor: amountMinor,
        contribution_type: type,
        campaign_id: type === 'dedicated' ? campaignId : undefined,
        ...(type === 'fine' && openFines.some((f) => f.id === fineId) ? { fine_id: fineId } : {}),
        paid_at: paidAt,
        // Sent only when a month was named (a "Pay" from Ibirarane); otherwise
        // the server uses the month of the date paid.
        period_year: hasPeriod && chosenPeriod !== null ? year : undefined,
        period_month: hasPeriod && chosenPeriod !== null ? month : undefined,
        settle_arrears: settles ? true : undefined,
        payment_method: method,
        payment_reference: reference.trim() || undefined,
        account_id: channel || undefined,
        proof: proof ?? undefined,
      },
      {
        onSuccess: onRecorded,
        onError: (error) => {
          // 503: the server has no file storage; 502: storage refused the file.
          // The payment itself can still go through without the attachment.
          if (error instanceof ApiError && (error.status === 503 || error.status === 502)) {
            setErrors({
              proof:
                error.status === 503
                  ? 'Attachments are not available yet. Remove the file and send the payment with its transaction reference instead.'
                  : 'The file could not be stored. Try again, or remove it and send the payment without it.',
            });
            return;
          }
          const f = error instanceof ApiError ? error.fieldErrors : {};
          const mapped: Errors = {
            account_id: f.account_id,
            membership_id: f.membership_id,
            contribution_type: f.contribution_type,
            campaign_id: f.campaign_id,
            fine_id: f.fine_id,
            period: f.period_month ?? f.period_year,
            amount: f.amount_minor,
            paid_at: f.paid_at,
            payment_method: f.payment_method,
            payment_reference: f.payment_reference,
            proof: f.proof,
          };
          const anyField = Object.values(mapped).some(Boolean);
          setErrors({ ...mapped, form: anyField ? undefined : errorMessage(error) });
        },
      },
    );
  }

  const selectedCampaign = openCampaigns.find((c) => c.id === campaignId);
  const selectedFine = openFines.find((f) => f.id === fineId);

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      {canPickMember && (
        <Select
          label="Who paid?"
          value={who}
          placeholder={who === '' ? 'Choose the member who paid' : undefined}
          onChange={(event) => changeWho(event.target.value)}
          options={[
            { value: 'me', label: 'Me' },
            ...others
              .map((m) => ({ value: m.id, label: m.full_name ?? m.email ?? 'Member' }))
              .sort((a, b) => a.label.localeCompare(b.label)),
          ]}
          hint={
            forOther && who !== ''
              ? 'Someone else must confirm it.'
              : members.isPending
                ? 'Loading members…'
                : undefined
          }
          error={errors.membership_id}
        />
      )}

      {/* Only a choice while an event collects money; otherwise it is the monthly contribution. */}
      {typeOptions.length > 1 && (
        <Select
          label="What is this payment for?"
          value={type}
          onChange={(event) => changeType(event.target.value as ContributionType)}
          options={typeOptions}
          error={errors.contribution_type}
        />
      )}

      {type === 'dedicated' && (
        <Select
          label="Which event?"
          value={campaignId}
          onChange={(event) => changeCampaign(event.target.value)}
          options={openCampaigns.map((c) => ({ value: c.id, label: c.title }))}
          hint={
            selectedCampaign?.my_share.outstanding_minor
              ? `You owe ${formatAmount(selectedCampaign.my_share.outstanding_minor)} ${selectedCampaign.currency}.`
              : undefined
          }
          error={errors.campaign_id}
        />
      )}

      {type === 'fine' && openFines.length > 0 && (
        <Select
          label="Which fine?"
          value={fineId}
          placeholder="Choose the fine you paid"
          onChange={(event) => changeFine(event.target.value)}
          options={openFines.map((f) => ({
            value: f.id,
            label: `${f.reason} · ${formatAmount(f.outstanding_minor)} ${f.currency} left`,
          }))}
          hint={
            selectedFine && selectedFine.pending_minor > 0
              ? `${formatAmount(selectedFine.pending_minor)} ${selectedFine.currency} already waiting for review.`
              : undefined
          }
          error={errors.fine_id}
        />
      )}

      {hasPeriod && chosenPeriod !== null && (
        <p className="table__muted">Paying for {periodLabel(...periodParts(chosenPeriod))}.</p>
      )}

      <Input
        label="Amount (RWF)"
        type="number"
        inputMode="decimal"
        min={1}
        step="any"
        value={amount}
        onChange={(event) => {
          setAmount(event.target.value);
          // A new amount answers the old "too large" (or any amount) error.
          if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
        }}
        hint={
          hasPeriod && monthly
            ? forOther
              ? `${payer?.shares ?? 1} share${payer?.shares === 1 ? '' : 's'}: ${formatAmount(monthly)} RWF a month.`
              : `${shares?.count ?? 1} share${shares?.count === 1 ? '' : 's'}: ${formatAmount(monthly)} RWF a month.`
            : undefined
        }
        error={errors.amount}
        required
      />

      {showPlan && (
        <div className="notice notice--info arrears-first" role="status">
          <div>
            <p className="notice__title">
              {owedUpToPeriod > 0
                ? `Ibirarane first: ${formatAmount(owedUpToPeriod)} RWF still owed`
                : 'Paying ahead'}
            </p>
            {plan.length > 0 && (
              <ul className="arrears-first__list" role="list">
                {(plan.length > LONG_PLAN ? summarise(plan) : plan.map(onePiece)).map((row) => (
                  <li key={row.key}>
                    <span>
                      {row.label}
                      {row.ahead && <span className="table__muted"> · ahead</span>}
                    </span>
                    <span>{formatAmount(row.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            {aheadMinor > 0 && (
              <p className="notice__text">
                {formatAmount(aheadMinor)} RWF pays months that are not due yet.
              </p>
            )}
            {owedUpToPeriod > 0 && (
              <button
                type="button"
                className="link-action"
                onClick={() => setAmount(toInput(payAllMinor))}
              >
                Pay everything owed
              </button>
            )}
          </div>
        </div>
      )}

      <div className="form-row">
        <Input
          label="Date paid"
          type="date"
          value={paidAt}
          max={toIsoDate(today)}
          onChange={(event) => setPaidAt(event.target.value)}
          error={errors.paid_at}
          required
        />

        <Select
          label="Payment method"
          value={method}
          onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          options={METHOD_ORDER.map((m) => ({ value: m, label: METHOD_LABEL[m].label }))}
          error={errors.payment_method}
        />
      </div>

      <div className="form-row">
        {channels.length > 0 && (
          <Select
            label="Paid into"
            hint="The account the money went into."
            placeholder="Choose the account"
            value={channel}
            onChange={(event) => setPickedChannel(event.target.value)}
            options={channels.map((c) => ({
              value: c.id,
              label: c.number ? `${c.name} · ${c.number}` : c.name,
            }))}
            error={errors.account_id}
            required
          />
        )}

        <Input
          label="Transaction reference"
          optional
          placeholder={method === 'bank_transfer' ? 'Bank reference' : 'e.g. MoMo transaction ID'}
          maxLength={120}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          error={errors.payment_reference}
        />
      </div>

      <FilePicker
        label="Proof of payment"
        prompt="or drag the MoMo screenshot or bank slip here"
        value={proof}
        onChange={setProof}
        error={errors.proof}
      />

      {errors.form && <p className="form-error">{errors.form}</p>}

      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" icon={<IconPlusCircle />} disabled={record.isPending}>
          {record.isPending ? 'Sending…' : 'Send for review'}
        </Button>
      </div>
    </form>
  );
}
