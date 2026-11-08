import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button, Dialog, IconPencil, IconTile, Input, Select, Textarea } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import { useActiveBudgets, useUpdateExpense } from '../api/expenses';
import type { Expense } from '../api/expenses';
import type { PaymentMethod } from '../api/types';
import { formatAmount } from '../format';
import { METHOD_LABEL } from '../labels';

const METHODS: PaymentMethod[] = ['mobile_money', 'bank_transfer', 'cash'];
const today = () => new Date().toLocaleDateString('en-CA');

/**
 * Edit an expense (backend S3-08): the details that do not move money. The
 * amount never changes -- a wrong amount is reversed and recorded again --
 * and the date and budget change only while it is still pending, because
 * once approved they decide which month and which budget the money left from.
 */
export function EditExpenseDialog({
  expense,
  onClose,
  onSaved,
}: {
  expense: Expense | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  return (
    <Dialog
      open={expense !== null}
      onClose={onClose}
      title="Edit expense"
      subtitle={
        expense
          ? `The amount (${formatAmount(expense.amount_minor)} ${expense.currency}) cannot change: reverse it and record it again if it is wrong.`
          : ''
      }
      icon={
        <IconTile tone="brand" round>
          <IconPencil />
        </IconTile>
      }
    >
      {expense && <EditForm expense={expense} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function EditForm({
  expense,
  onClose,
  onSaved,
}: {
  expense: Expense;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const update = useUpdateExpense();
  const pending = expense.status === 'pending';
  const budgets = useActiveBudgets(communityId, pending);
  const [description, setDescription] = useState(expense.description);
  const [category, setCategory] = useState(expense.category ?? '');
  const [payee, setPayee] = useState(expense.payee ?? '');
  const [method, setMethod] = useState<PaymentMethod>(expense.payment_method ?? 'mobile_money');
  const [reference, setReference] = useState(expense.payment_reference ?? '');
  const [memo, setMemo] = useState(expense.memo ?? '');
  const [spentAt, setSpentAt] = useState(expense.spent_at);
  const [budgetId, setBudgetId] = useState(expense.budget?.id ?? '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (description.trim().length < 3) {
      setErrors({ description: 'Give it a title of at least 3 characters.' });
      return;
    }
    if (!communityId) return;
    update.mutate(
      {
        communityId,
        expenseId: expense.id,
        description: description.trim(),
        category: category.trim() || null,
        payee: payee.trim() || null,
        payment_method: method,
        payment_reference: reference.trim() || null,
        memo: memo.trim() || null,
        ...(pending ? { spent_at: spentAt, budget_id: budgetId || null } : {}),
      },
      {
        onSuccess: () => onSaved(`${description.trim()} saved.`),
        onError: (error) => {
          const f = error instanceof ApiError ? error.fieldErrors : {};
          const mapped = {
            description: f.description,
            category: f.category,
            payee: f.payee,
            payment_reference: f.payment_reference,
            spent_at: f.spent_at,
            budget: f.budget_id,
          };
          setErrors({
            ...mapped,
            form: Object.values(mapped).some(Boolean) ? undefined : errorMessage(error),
          });
        },
      },
    );
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      <Input
        label="What was it for?"
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
          maxLength={80}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          error={errors.category}
        />
        <Input
          label="Paid to"
          optional
          maxLength={160}
          value={payee}
          onChange={(event) => setPayee(event.target.value)}
          error={errors.payee}
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
          maxLength={120}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          error={errors.payment_reference}
        />
      </div>
      {pending && (
        <div className="form-row">
          <Input
            label="Date paid"
            type="date"
            max={today()}
            value={spentAt}
            onChange={(event) => setSpentAt(event.target.value)}
            error={errors.spent_at}
          />
          <Select
            label="Paid from"
            value={budgetId}
            onChange={(event) => setBudgetId(event.target.value)}
            options={[
              { value: '', label: 'The cash box (general funds)' },
              ...(budgets.data?.items ?? []).map((b) => ({
                value: b.id,
                label: `Budget: ${b.title}`,
              })),
            ]}
            error={errors.budget}
          />
        </div>
      )}
      {!pending && (
        <p className="table__muted">The date and budget are fixed once an expense is approved.</p>
      )}
      <Textarea
        label="Notes"
        optional
        rows={2}
        maxLength={1000}
        value={memo}
        onChange={(event) => setMemo(event.target.value)}
      />
      {errors.form && <p className="form-error">{errors.form}</p>}
      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
