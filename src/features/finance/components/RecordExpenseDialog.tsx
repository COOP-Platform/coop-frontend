import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button, Dialog, IconSend, IconTile, Input, Select, Textarea } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import { useActiveBudgets, useRecordExpense } from '../api/expenses';
import type { ExpenseDetail } from '../api/expenses';
import type { PaymentMethod } from '../api/types';
import { MINOR_PER_MAJOR, formatAmount } from '../format';
import { METHOD_LABEL } from '../labels';
import { FilePicker } from './FilePicker';

/** Suggestions only: the backend takes any category text. */
const EXPENSE_CATEGORIES = [
  'Venue',
  'Welfare',
  'Event',
  'Refreshments',
  'Transport',
  'Admin',
  'Bank fees',
  'Other',
];

const METHODS: PaymentMethod[] = ['mobile_money', 'bank_transfer', 'cash'];
/** Today in the user's own time zone, as `YYYY-MM-DD`. */
const today = () => new Date().toLocaleDateString('en-CA');

interface Errors {
  description?: string;
  category?: string;
  payee?: string;
  amount?: string;
  spent_at?: string;
  payment_reference?: string;
  budget_id?: string;
  receipt?: string;
  memo?: string;
  form?: string;
}

/**
 * The Treasurer records money that left the community. It waits for another
 * approver before it counts (the recorder never approves their own).
 */
export function RecordExpenseDialog({
  open,
  onClose,
  onRecorded,
}: {
  open: boolean;
  onClose: () => void;
  onRecorded: (expense: ExpenseDetail) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Record Expense"
      subtitle="Money paid out of the community. It is approved by someone else before it counts."
      icon={
        <IconTile tone="warning" round>
          <IconSend />
        </IconTile>
      }
    >
      {open && <ExpenseForm onClose={onClose} onRecorded={onRecorded} />}
    </Dialog>
  );
}

function ExpenseForm({
  onClose,
  onRecorded,
}: {
  onClose: () => void;
  onRecorded: (expense: ExpenseDetail) => void;
}) {
  const { communityId } = useWorkspace();
  const record = useRecordExpense();
  const budgets = useActiveBudgets(communityId, true);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [spentAt, setSpentAt] = useState(today());
  const [method, setMethod] = useState<PaymentMethod>('mobile_money');
  const [reference, setReference] = useState('');
  const [budgetId, setBudgetId] = useState('');
  const [memo, setMemo] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  const budgetOptions = [
    { value: '', label: 'Not from a budget' },
    ...(budgets.data?.items ?? []).map((b) => ({
      value: b.id,
      label: `${b.title} (${formatAmount(b.left_to_spend_minor)} ${b.currency} left)`,
    })),
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: Errors = {};
    const amountMinor = Math.round(Number(amount) * MINOR_PER_MAJOR);
    if (description.trim().length < 3)
      problems.description = 'Give it a title of at least 3 characters.';
    if (amount.trim() === '' || !Number.isFinite(amountMinor) || amountMinor <= 0)
      problems.amount = 'Enter the amount paid, more than 0.';
    if (spentAt === '') problems.spent_at = 'Enter the day the money was paid.';
    else if (spentAt > today()) problems.spent_at = 'The date cannot be in the future.';
    setErrors(problems);
    if (Object.keys(problems).length > 0 || communityId === undefined) return;

    record.mutate(
      {
        communityId,
        description: description.trim(),
        category: category.trim() || undefined,
        payee: payee.trim() || undefined,
        amount_minor: amountMinor,
        spent_at: spentAt,
        payment_method: method,
        payment_reference: reference.trim() || undefined,
        memo: memo.trim() || undefined,
        budget_id: budgetId || undefined,
        receipt: receipt ?? undefined,
      },
      {
        onSuccess: onRecorded,
        onError: (error) => {
          if (error instanceof ApiError && (error.status === 503 || error.status === 502)) {
            setErrors({
              receipt:
                'The receipt could not be stored right now. Remove it and record the expense without it.',
            });
            return;
          }
          const f = error instanceof ApiError ? error.fieldErrors : {};
          const mapped: Errors = {
            description: f.description,
            category: f.category,
            payee: f.payee,
            amount: f.amount_minor,
            spent_at: f.spent_at,
            payment_reference: f.payment_reference,
            budget_id: f.budget_id ?? f.budget_line_id,
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
        label="What was it for?"
        placeholder="e.g. Hall reservation, General Assembly"
        maxLength={255}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        error={errors.description}
        required
      />
      <div className="form-row">
        <Input
          label="Category"
          optional
          list="expense-categories"
          placeholder="e.g. Venue"
          maxLength={80}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          error={errors.category}
        />
        <datalist id="expense-categories">
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Input
          label="Paid to"
          optional
          placeholder="e.g. Kigali Hall Ltd"
          maxLength={160}
          value={payee}
          onChange={(event) => setPayee(event.target.value)}
          error={errors.payee}
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
          label="Date paid"
          type="date"
          max={today()}
          value={spentAt}
          onChange={(event) => setSpentAt(event.target.value)}
          error={errors.spent_at}
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
          placeholder="Cheque no., MoMo or bank ref."
          maxLength={120}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          error={errors.payment_reference}
        />
      </div>
      {budgetOptions.length > 1 && (
        <Select
          label="Spent from budget"
          value={budgetId}
          onChange={(event) => setBudgetId(event.target.value)}
          options={budgetOptions}
          error={errors.budget_id}
        />
      )}
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
        prompt="or drag the receipt or invoice here"
        value={receipt}
        onChange={setReceipt}
        error={errors.receipt}
      />

      {errors.form && <p className="form-error">{errors.form}</p>}

      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" icon={<IconSend />} disabled={record.isPending}>
          {record.isPending ? 'Saving…' : 'Record for approval'}
        </Button>
      </div>
    </form>
  );
}
