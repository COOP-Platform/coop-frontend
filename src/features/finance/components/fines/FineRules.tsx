import type { FormEvent } from 'react';
import { useState } from 'react';

import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  EmptyState,
  ErrorState,
  IconPencil,
  IconPlusCircle,
  IconSliders,
  IconTile,
  IconTrash,
  Input,
  LoadingState,
  SectionCard,
  Select,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import {
  useCreateFineRule,
  useDeleteFineRule,
  useFineRules,
  useUpdateFineRule,
} from '../../api/fines';
import type { FineKind, FineRule } from '../../api/fines';
import { MINOR_PER_MAJOR, formatAmount } from '../../format';
import { Money } from '../Money';
import { SuccessNotice } from '../SuccessNotice';
import { FINE_KIND_LABEL, FINE_KIND_OPTIONS } from './fine-text';

const ordinal = (n: number) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};

/** "Late after the 10th of the month", "Missed a meeting". */
function ruleWhen(rule: FineRule): string {
  if (rule.kind === 'late_payment' && rule.late_after_day !== null)
    return `Unpaid by the ${ordinal(rule.late_after_day)} of next month`;
  if (rule.kind === 'meeting_absence') return 'Absent, not excused';
  return FINE_KIND_LABEL[rule.kind];
}

/** The standing rules that suggest fines. Turning one off stops its suggestions. */
export function FineRules() {
  const { communityId } = useWorkspace();
  const rules = useFineRules(communityId);
  const update = useUpdateFineRule();
  const remove = useDeleteFineRule();
  const [editing, setEditing] = useState<FineRule | 'new' | null>(null);
  const [deleting, setDeleting] = useState<FineRule | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  function toggleActive(rule: FineRule) {
    if (communityId === undefined) return;
    setRowError(null);
    update.mutate(
      { communityId, ruleId: rule.id, is_active: !rule.is_active },
      {
        onSuccess: () =>
          setDone(rule.is_active ? `"${rule.name}" is turned off.` : `"${rule.name}" is on again.`),
        onError: (error) => setRowError({ id: rule.id, message: errorMessage(error) }),
      },
    );
  }

  function deleteRule(rule: FineRule) {
    setDeleting(null);
    if (communityId === undefined) return;
    setRowError(null);
    remove.mutate(
      { communityId, ruleId: rule.id },
      {
        onSuccess: () => setDone(`"${rule.name}" is deleted.`),
        onError: (error) => setRowError({ id: rule.id, message: errorMessage(error) }),
      },
    );
  }

  return (
    <SectionCard
      title="Rules"
      flush
      actions={
        <Button inline icon={<IconPlusCircle />} onClick={() => setEditing('new')}>
          Add a rule
        </Button>
      }
    >
      {done && (
        <div className="fines__notice">
          <SuccessNotice text={done} />
        </div>
      )}

      {rules.isPending ? (
        <LoadingState />
      ) : rules.error ? (
        <ErrorState title="Couldn't load the rules" message={errorMessage(rules.error)} />
      ) : rules.data.length === 0 ? (
        <EmptyState icon={<IconSliders width={28} height={28} />} title="No fine rules yet" />
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Rule</th>
                <th scope="col">When</th>
                <th scope="col" className="num">
                  Amount
                </th>
                <th scope="col">Status</th>
                <th scope="col" className="table__action-col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.data.map((rule) => (
                <tr key={rule.id} className={rule.is_active ? undefined : 'fines__row--off'}>
                  <td>
                    <span className="table__stack">
                      <span>{rule.name}</span>
                      {rowError?.id === rule.id && (
                        <span className="table__warn" role="alert">
                          {rowError.message}
                        </span>
                      )}
                    </span>
                  </td>
                  <td>{ruleWhen(rule)}</td>
                  <td className="num">
                    <Money minor={rule.amount_minor} currency={rule.currency} />
                  </td>
                  <td>
                    <Badge tone={rule.is_active ? 'success' : 'neutral'}>
                      {rule.is_active ? 'On' : 'Off'}
                    </Badge>
                  </td>
                  <td className="table__action-col">
                    <span className="fines__actions">
                      <button
                        type="button"
                        className="link-action"
                        onClick={() => setEditing(rule)}
                        aria-label={`Edit ${rule.name}`}
                      >
                        <IconPencil width={16} height={16} aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="link-action"
                        disabled={update.isPending}
                        onClick={() => toggleActive(rule)}
                      >
                        {rule.is_active ? 'Turn off' : 'Turn on'}
                      </button>
                      <button
                        type="button"
                        className="link-action fines__danger"
                        disabled={remove.isPending}
                        onClick={() => setDeleting(rule)}
                        aria-label={`Delete ${rule.name}`}
                      >
                        <IconTrash width={16} height={16} aria-hidden="true" />
                        Delete
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add a fine rule' : 'Edit fine rule'}
        icon={
          <IconTile tone="brand" round>
            <IconSliders />
          </IconTile>
        }
      >
        {editing !== null && (
          <RuleForm
            rule={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={(saved) => {
              setEditing(null);
              setDone(`"${saved.name}" is saved.`);
            }}
          />
        )}
      </Dialog>

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this rule?"
        subtitle="Issued fines stay. To pause it, turn it off."
        icon={
          <IconTile tone="warning" round>
            <IconTrash />
          </IconTile>
        }
      >
        {deleting && (
          <div className="dialog__form">
            <p className="table__muted">
              {deleting.name} · {formatAmount(deleting.amount_minor)} {deleting.currency}
            </p>
            <div className="dialog__footer dialog__footer--flush">
              <Button variant="tint" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button variant="danger" icon={<IconTrash />} onClick={() => deleteRule(deleting)}>
                Delete rule
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </SectionCard>
  );
}

interface RuleErrors {
  name?: string;
  kind?: string;
  amount?: string;
  late_after_day?: string;
  form?: string;
}

function RuleForm({
  rule,
  onClose,
  onSaved,
}: {
  rule: FineRule | null;
  onClose: () => void;
  onSaved: (rule: FineRule) => void;
}) {
  const { communityId } = useWorkspace();
  const create = useCreateFineRule();
  const update = useUpdateFineRule();
  const [name, setName] = useState(rule?.name ?? '');
  const [kind, setKind] = useState<FineKind>(rule?.kind ?? 'late_payment');
  const [amount, setAmount] = useState(rule ? String(rule.amount_minor / MINOR_PER_MAJOR) : '');
  const [lateDay, setLateDay] = useState(String(rule?.late_after_day ?? 10));
  const [active, setActive] = useState(rule?.is_active ?? true);
  const [errors, setErrors] = useState<RuleErrors>({});
  const busy = create.isPending || update.isPending;

  const amountMinor = Math.round(Number(amount) * MINOR_PER_MAJOR);
  const day = Number(lateDay);
  const preview =
    Number.isFinite(amountMinor) && amountMinor > 0
      ? kind === 'late_payment' && day >= 1 && day <= 28
        ? `October unpaid by ${day} November: RWF ${formatAmount(amountMinor)} fine.`
        : kind === 'meeting_absence'
          ? `Absent, not excused: RWF ${formatAmount(amountMinor)} fine.`
          : null
      : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: RuleErrors = {};
    if (name.trim().length < 2) problems.name = 'Give the rule a name, 2 letters or more.';
    if (amount.trim() === '' || !Number.isFinite(amountMinor) || amountMinor <= 0)
      problems.amount = 'Enter the fine amount, more than 0.';
    if (kind === 'late_payment' && !(Number.isInteger(day) && day >= 1 && day <= 28))
      problems.late_after_day = 'Choose a day from 1 to 28.';
    setErrors(problems);
    if (Object.keys(problems).length > 0 || communityId === undefined) return;

    const fields = {
      name: name.trim(),
      kind,
      amount_minor: amountMinor,
      late_after_day: kind === 'late_payment' ? day : null,
      is_active: active,
    };
    const handlers = {
      onSuccess: onSaved,
      onError: (error: unknown) => {
        if (error instanceof ApiError && error.code === 'duplicate_name') {
          setErrors({ name: 'Another rule already has this name.' });
          return;
        }
        const f = error instanceof ApiError ? error.fieldErrors : {};
        const mapped: RuleErrors = {
          name: f.name,
          kind: f.kind,
          amount: f.amount_minor,
          late_after_day: f.late_after_day,
        };
        const anyField = Object.values(mapped).some(Boolean);
        setErrors({ ...mapped, form: anyField ? undefined : errorMessage(error) });
      },
    };
    if (rule === null) create.mutate({ communityId, ...fields }, handlers);
    else update.mutate({ communityId, ruleId: rule.id, ...fields }, handlers);
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      <Input
        label="Name"
        placeholder="e.g. Late monthly contribution"
        maxLength={120}
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
        required
      />
      <Select
        label="What is it for?"
        value={kind}
        onChange={(event) => setKind(event.target.value as FineKind)}
        options={FINE_KIND_OPTIONS}
        hint={kind === 'other' ? 'Suggests nothing by itself: a shortcut when issuing.' : undefined}
        error={errors.kind}
      />
      {kind === 'late_payment' && (
        <Input
          label="Late after day"
          type="number"
          inputMode="numeric"
          min={1}
          max={28}
          value={lateDay}
          onChange={(event) => setLateDay(event.target.value)}
          hint="Day of the next month a payment is late."
          error={errors.late_after_day}
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
        error={errors.amount}
        required
      />
      <Checkbox
        label="On: suggest fines with this rule"
        checked={active}
        onChange={(event) => setActive(event.target.checked)}
      />
      {preview && <p className="table__muted">{preview}</p>}

      {errors.form && <p className="form-error">{errors.form}</p>}

      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save rule'}
        </Button>
      </div>
    </form>
  );
}
