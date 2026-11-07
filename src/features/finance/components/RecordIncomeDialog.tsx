import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button, Dialog, IconPiggyBank, IconTile, Input, Select, Textarea } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import { useRecordIncome } from '../api/income';
import type { IncomeDetail, IncomeSource } from '../api/income';
import type { PaymentMethod } from '../api/types';
import { MINOR_PER_MAJOR } from '../format';
import { INCOME_SOURCE, METHOD_LABEL } from '../labels';
import { FilePicker } from './FilePicker';

const SOURCES: IncomeSource[] = ['donation', 'event_revenue', 'interest', 'other'];
const METHODS: PaymentMethod[] = ['mobile_money', 'bank_transfer', 'cash'];
/** Today in the user's own time zone, as `YYYY-MM-DD`. */
const today = () => new Date().toLocaleDateString('en-CA');

interface Errors {
  title?: string;
  amount?: string;
  received_on?: string;
  received_from?: string;
  payment_reference?: string;
  receipt?: string;
  memo?: string;
  form?: string;
}

/**
 * Money in that is not a member's contribution. No approval: it counts in the
 * wallet as soon as it is saved, and is corrected only by a reversal.
 */
export function RecordIncomeDialog({
  open,
  onClose,
  onRecorded,
}: {
  open: boolean;
  onClose: () => void;
  onRecorded: (income: IncomeDetail) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Record Income"
      subtitle="Donations, event revenue, interest: money in that is not a member's contribution. It counts straight away."
      icon={
        <IconTile tone="brand" round>
          <IconPiggyBank />
        </IconTile>
      }
    >
      {open && <IncomeForm onClose={onClose} onRecorded={onRecorded} />}
    </Dialog>
  );
}

function IncomeForm({
  onClose,
  onRecorded,
}: {
  onClose: () => void;
  onRecorded: (income: IncomeDetail) => void;
}) {
  const { communityId } = useWorkspace();
  const record = useRecordIncome();
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<IncomeSource>('donation');
  const [amount, setAmount] = useState('');
  const [receivedOn, setReceivedOn] = useState(today());
  const [receivedFrom, setReceivedFrom] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('mobile_money');
  const [reference, setReference] = useState('');
  const [memo, setMemo] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: Errors = {};
    const amountMinor = Math.round(Number(amount) * MINOR_PER_MAJOR);
    if (title.trim().length < 3) problems.title = 'Say what came in, at least 3 characters.';
    if (amount.trim() === '' || !Number.isFinite(amountMinor) || amountMinor <= 0)
      problems.amount = 'Enter the amount received, more than 0.';
    if (receivedOn === '') problems.received_on = 'Enter the day the money came in.';
    else if (receivedOn > today()) problems.received_on = 'The date cannot be in the future.';
    setErrors(problems);
    if (Object.keys(problems).length > 0 || communityId === undefined) return;

    record.mutate(
      {
        communityId,
        title: title.trim(),
        source,
        amount_minor: amountMinor,
        received_on: receivedOn,
        received_from: receivedFrom.trim() || undefined,
        payment_method: method,
        payment_reference: reference.trim() || undefined,
        memo: memo.trim() || undefined,
        receipt: receipt ?? undefined,
      },
      {
        onSuccess: onRecorded,
        onError: (error) => {
          if (error instanceof ApiError && (error.status === 503 || error.status === 502)) {
            setErrors({
              receipt:
                'The receipt could not be stored right now. Remove it and record the income without it.',
            });
            return;
          }
          const f = error instanceof ApiError ? error.fieldErrors : {};
          const mapped: Errors = {
            title: f.title ?? f.source,
            amount: f.amount_minor,
            received_on: f.received_on,
            received_from: f.received_from,
            payment_reference: f.payment_reference,
            receipt: f.receipt,
            memo: f.memo,
          };
          const anyField = Object.values(mapped).some(Boolean);
          setErrors({ ...mapped, form: anyField ? undefined : errorMessage(error) });
        },
      },
    );
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      <Input
        label="What came in?"
        placeholder="e.g. Donation from a well-wisher"
        maxLength={160}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={errors.title}
        required
      />
      <div className="form-row">
        <Select
          label="Source"
          value={source}
          onChange={(event) => setSource(event.target.value as IncomeSource)}
          options={SOURCES.map((s) => ({ value: s, label: INCOME_SOURCE[s] }))}
        />
        <Input
          label="Received from"
          optional
          placeholder="e.g. a donor, the bank"
          maxLength={160}
          value={receivedFrom}
          onChange={(event) => setReceivedFrom(event.target.value)}
          error={errors.received_from}
        />
      </div>
      <div className="form-row">
        <Input
          label="Amount (RWF)"
          type="number"
          inputMode="decimal"
          min={1}
          step="any"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={errors.amount}
          required
        />
        <Input
          label="Date received"
          type="date"
          max={today()}
          value={receivedOn}
          onChange={(event) => setReceivedOn(event.target.value)}
          error={errors.received_on}
          required
        />
      </div>
      <div className="form-row">
        <Select
          label="Payment method"
          value={method}
          onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          options={METHODS.map((m) => ({ value: m, label: METHOD_LABEL[m].label }))}
        />
        <Input
          label="Reference"
          optional
          placeholder="MoMo or bank reference"
          maxLength={120}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          error={errors.payment_reference}
        />
      </div>
      <Textarea
        label="Notes"
        optional
        rows={2}
        maxLength={1000}
        value={memo}
        onChange={(event) => setMemo(event.target.value)}
        error={errors.memo}
      />
      <FilePicker
        label="Receipt"
        prompt="or drag the receipt or bank slip here"
        value={receipt}
        onChange={setReceipt}
        error={errors.receipt}
      />

      {errors.form && <p className="form-error">{errors.form}</p>}

      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" icon={<IconPiggyBank />} disabled={record.isPending}>
          {record.isPending ? 'Saving…' : 'Record income'}
        </Button>
      </div>
    </form>
  );
}
