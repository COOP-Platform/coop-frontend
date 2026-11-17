import type { FormEvent } from 'react';
import { useState } from 'react';

import { Button, Dialog, IconPlusCircle, IconTile, Input, Select } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { useMemberships } from '@/features/members';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import { useChannels } from '../api/accounts';
import type { Account } from '../api/accounts';
import { useMyFines } from '../api/fines';
import { FINES_ENABLED } from '../features';
import { useOpenCampaigns, useRecordContribution } from '../api/my-contributions';
import type { Contribution, MyContributions } from '../api/my-contributions';
import { useShareCategories } from '../api/shares';
import type { ContributionType, PaymentMethod } from '../api/types';
import { MINOR_PER_MAJOR, formatAmount } from '../format';
import { FilePicker } from './FilePicker';
import { METHOD_LABEL, TYPE_LABEL } from '../labels';

/** Types a member records for themselves, in the order they are asked most. */
const TYPE_ORDER: ContributionType[] = [
  'monthly',
  'arrears',
  'dedicated',
  'one_off',
  ...(FINES_ENABLED ? (['fine'] as const) : []),
];
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
  onRecorded: (contribution: Contribution) => void;
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
      title={forMember ? 'Record a payment for a member' : 'Record Contribution'}
      subtitle={
        forMember
          ? 'A member paid you or the community directly. It stays pending until someone else confirms it.'
          : 'Tell the Treasurer about a payment you made. It stays pending until they confirm it.'
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
  const [type, setType] = useState<ContributionType>(initial?.type ?? 'monthly');
  const [campaignId, setCampaignId] = useState(initial?.campaignId ?? '');
  const [fineId, setFineId] = useState(initial?.fineId ?? '');
  const [period, setPeriod] = useState(initial?.period ?? toIsoMonth(today));
  const [amount, setAmount] = useState(toInput(initial?.amountMinor ?? monthly));
  const [paidAt, setPaidAt] = useState(toIsoDate(today));
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
    (t) => ({ value: t, label: TYPE_LABEL[t] }),
  );

  function changeType(next: ContributionType) {
    setType(next);
    setErrors({});
    if (next === 'monthly') {
      setPeriod(toIsoMonth(today));
      setAmount(toInput(monthly));
    } else if (next === 'arrears') {
      const last = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      setPeriod(toIsoMonth(last));
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
    setPeriod(toIsoMonth(today));
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
    const amountMinor = Math.round(Number(amount) * MINOR_PER_MAJOR);
    if (amount.trim() === '' || !Number.isFinite(amountMinor) || amountMinor <= 0)
      problems.amount = 'Enter the amount you paid, more than 0.';
    if (paidAt === '') problems.paid_at = 'Enter the day you paid.';
    else if (paidAt > toIsoDate(today))
      problems.paid_at = 'The payment date cannot be in the future.';
    if (hasPeriod && period === '') problems.period = 'Choose the month this payment is for.';
    if (type === 'arrears' && period >= toIsoMonth(today))
      problems.period = 'Arrears pay for a past month. Choose an earlier month.';
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
        period_year: hasPeriod ? year : undefined,
        period_month: hasPeriod ? month : undefined,
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
              ? 'You recorded it, so someone else must confirm it.'
              : members.isPending
                ? 'Loading members…'
                : undefined
          }
          error={errors.membership_id}
        />
      )}

      <Select
        label="What is this payment for?"
        value={type}
        onChange={(event) => changeType(event.target.value as ContributionType)}
        options={typeOptions}
        error={errors.contribution_type}
      />

      {type === 'dedicated' && (
        <Select
          label="Dedicated contribution"
          value={campaignId}
          onChange={(event) => changeCampaign(event.target.value)}
          options={openCampaigns.map((c) => ({ value: c.id, label: c.title }))}
          hint={
            selectedCampaign?.my_share.outstanding_minor
              ? `You still owe ${formatAmount(selectedCampaign.my_share.outstanding_minor)} ${selectedCampaign.currency} for it.`
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
              ? `${formatAmount(selectedFine.pending_minor)} ${selectedFine.currency} for it is already waiting for the Treasurer.`
              : undefined
          }
          error={errors.fine_id}
        />
      )}

      {hasPeriod && (
        <Input
          label="Month paid for"
          type="month"
          value={period}
          max={toIsoMonth(today)}
          onChange={(event) => setPeriod(event.target.value)}
          error={errors.period}
          required
        />
      )}

      <Input
        label="Amount (RWF)"
        type="number"
        inputMode="decimal"
        min={1}
        step="any"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        hint={
          hasPeriod && monthly
            ? forOther
              ? `${payer?.full_name ?? 'Their'}${payer?.full_name ? "'s" : ''} ${payer?.shares ?? 1} share${payer?.shares === 1 ? '' : 's'} come to ${formatAmount(monthly)} RWF a month.`
              : `Your ${shares?.count ?? 1} share${shares?.count === 1 ? '' : 's'} come to ${formatAmount(monthly)} RWF a month.`
            : undefined
        }
        error={errors.amount}
        required
      />

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

      {channels.length > 0 && (
        <Select
          label="Paid into"
          hint="Where the money went. It can differ from how it was paid: a MoMo payment sent to the bank."
          placeholder="Choose the account"
          value={channel}
          onChange={(event) => setPickedChannel(event.target.value)}
          options={channels.map((c) => ({ value: c.id, label: c.name }))}
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
