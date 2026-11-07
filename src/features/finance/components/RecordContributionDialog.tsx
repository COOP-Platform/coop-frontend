import type { FormEvent } from 'react';
import { useState } from 'react';

import { Button, Dialog, IconPlusCircle, IconTile, Input, Select } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import { useOpenCampaigns, useRecordContribution } from '../api/my-contributions';
import type { Contribution, MyContributions } from '../api/my-contributions';
import type { ContributionType, PaymentMethod } from '../api/types';
import { MINOR_PER_MAJOR, formatAmount } from '../format';
import { FilePicker } from './FilePicker';
import { METHOD_LABEL, TYPE_LABEL } from '../labels';

/** Types a member records for themselves, in the order they are asked most. */
const TYPE_ORDER: ContributionType[] = ['monthly', 'arrears', 'dedicated', 'one_off', 'fine'];
const METHOD_ORDER: PaymentMethod[] = ['mobile_money', 'bank_transfer', 'cash'];

const pad = (n: number) => String(n).padStart(2, '0');
const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toIsoMonth = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/** Whole RWF for an input: 1000000 minor -> "10000". */
const toInput = (minor: number | null | undefined) =>
  minor ? String(minor / MINOR_PER_MAJOR) : '';

interface Errors {
  contribution_type?: string;
  campaign_id?: string;
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
}: RecordContributionDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Record Contribution"
      subtitle="Tell the Treasurer about a payment you made. It stays pending until they confirm it."
      icon={
        <IconTile tone="brand" round>
          <IconPlusCircle />
        </IconTile>
      }
    >
      {/* Mounted only while open, so every opening starts from a clean form. */}
      {open && <RecordContributionForm onClose={onClose} shares={shares} onRecorded={onRecorded} />}
    </Dialog>
  );
}

function RecordContributionForm({
  onClose,
  shares,
  onRecorded,
}: Omit<RecordContributionDialogProps, 'open'>) {
  const { communityId } = useWorkspace();
  const record = useRecordContribution();
  const campaigns = useOpenCampaigns(communityId, true);
  const openCampaigns = campaigns.data?.items ?? [];

  const today = new Date();
  const monthly = shares?.owed_per_month_minor;
  const [type, setType] = useState<ContributionType>('monthly');
  const [campaignId, setCampaignId] = useState('');
  const [period, setPeriod] = useState(toIsoMonth(today));
  const [amount, setAmount] = useState(toInput(monthly));
  const [paidAt, setPaidAt] = useState(toIsoDate(today));
  const [method, setMethod] = useState<PaymentMethod>('mobile_money');
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
      setAmount(toInput(first?.my_share.outstanding_minor ?? first?.my_share.owed_minor));
    } else {
      setAmount('');
    }
  }

  function changeCampaign(id: string) {
    setCampaignId(id);
    const campaign = openCampaigns.find((c) => c.id === id);
    setAmount(toInput(campaign?.my_share.outstanding_minor ?? campaign?.my_share.owed_minor));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: Errors = {};
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
    setErrors(problems);
    if (Object.keys(problems).length > 0 || communityId === undefined) return;

    const [year, month] = period.split('-').map(Number);
    record.mutate(
      {
        communityId,
        amount_minor: amountMinor,
        contribution_type: type,
        campaign_id: type === 'dedicated' ? campaignId : undefined,
        paid_at: paidAt,
        period_year: hasPeriod ? year : undefined,
        period_month: hasPeriod ? month : undefined,
        payment_method: method,
        payment_reference: reference.trim() || undefined,
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
            contribution_type: f.contribution_type,
            campaign_id: f.campaign_id,
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

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
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
            ? `Your ${shares?.count ?? 1} share${shares?.count === 1 ? '' : 's'} come to ${formatAmount(monthly)} RWF a month.`
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
