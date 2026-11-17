import type { FormEvent } from 'react';
import { useState } from 'react';

import { Button, Dialog, IconGavel, IconTile, Input, Select, Textarea } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { useMemberships } from '@/features/members';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';
import { useMeetings } from '@/features/meetings/api/meetings';

import { useFineRules, useIssueFine } from '../../api/fines';
import type { Fine, FineKind } from '../../api/fines';
import { MINOR_PER_MAJOR, formatAmount } from '../../format';
import { FINE_KIND_OPTIONS } from './fine-text';

interface Errors {
  membership_id?: string;
  kind?: string;
  amount?: string;
  reason?: string;
  period?: string;
  meeting?: string;
  form?: string;
}

/** Issue one fine by hand: pick the member, what it is for and how much. */
export function IssueFineDialog({
  open,
  onClose,
  onIssued,
}: {
  open: boolean;
  onClose: () => void;
  onIssued: (fine: Fine) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Issue a fine"
      icon={
        <IconTile tone="warning" round>
          <IconGavel />
        </IconTile>
      }
    >
      {open && <IssueFineForm onClose={onClose} onIssued={onIssued} />}
    </Dialog>
  );
}

function IssueFineForm({
  onClose,
  onIssued,
}: {
  onClose: () => void;
  onIssued: (fine: Fine) => void;
}) {
  const { communityId, can } = useWorkspace();
  const members = useMemberships(communityId, 'active');
  // Rules are only a shortcut here; without the right to see them the form still works.
  const rules = useFineRules(communityId, can('finance.fine.issue') || can('finance.fine.manage'));
  const activeRules = (rules.data ?? []).filter((r) => r.is_active);
  const issue = useIssueFine();

  const [membershipId, setMembershipId] = useState('');
  const [ruleId, setRuleId] = useState('');
  const [kind, setKind] = useState<FineKind>('other');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [period, setPeriod] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const meetings = useMeetings(kind === 'meeting_absence' ? communityId : undefined);
  const meetingOptions = (meetings.data ?? [])
    .filter((m) => m.status !== 'cancelled' && m.status !== 'scheduled')
    .map((m) => ({ value: m.id, label: `${m.title} · ${formatDate(m.scheduled_at)}` }));

  const memberOptions = [...(members.data ?? [])]
    .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''))
    .map((m) => ({ value: m.id, label: m.full_name ?? m.email ?? 'Member' }));

  function pickRule(id: string) {
    setRuleId(id);
    const rule = activeRules.find((r) => r.id === id);
    if (!rule) return;
    setKind(rule.kind);
    setAmount(String(rule.amount_minor / MINOR_PER_MAJOR));
    if (reason.trim() === '') setReason(rule.name);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: Errors = {};
    const amountMinor = Math.round(Number(amount) * MINOR_PER_MAJOR);
    if (membershipId === '') problems.membership_id = 'Choose the member to fine.';
    if (amount.trim() === '' || !Number.isFinite(amountMinor) || amountMinor <= 0)
      problems.amount = 'Enter the fine amount, more than 0.';
    if (reason.trim() === '') problems.reason = 'Say what it is for. The member sees it.';
    if (kind === 'late_payment' && period === '') problems.period = 'Choose the month paid late.';
    if (kind === 'meeting_absence' && meetingId === '')
      problems.meeting = 'Choose the meeting the member missed.';
    setErrors(problems);
    if (Object.keys(problems).length > 0 || communityId === undefined) return;

    const [year, month] = period === '' ? [undefined, undefined] : period.split('-').map(Number);
    issue.mutate(
      {
        communityId,
        membership_id: membershipId,
        kind,
        amount_minor: amountMinor,
        reason: reason.trim(),
        rule_id: ruleId || undefined,
        period_year: kind === 'late_payment' ? year : undefined,
        period_month: kind === 'late_payment' ? month : undefined,
        meeting_id: kind === 'meeting_absence' ? meetingId : undefined,
      },
      {
        onSuccess: onIssued,
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'already_fined') {
            setErrors({ form: 'This member is already fined for that.' });
            return;
          }
          const f = error instanceof ApiError ? error.fieldErrors : {};
          const mapped: Errors = {
            membership_id: f.membership_id,
            kind: f.kind ?? f.rule_id,
            amount: f.amount_minor,
            reason: f.reason,
            period: f.period_month ?? f.period_year,
            meeting: f.meeting_id,
          };
          const anyField = Object.values(mapped).some(Boolean);
          setErrors({ ...mapped, form: anyField ? undefined : errorMessage(error) });
        },
      },
    );
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      <Select
        label="Member"
        value={membershipId}
        placeholder={members.isPending ? 'Loading members…' : 'Choose a member'}
        onChange={(event) => setMembershipId(event.target.value)}
        options={memberOptions}
        error={errors.membership_id ?? (members.error ? errorMessage(members.error) : undefined)}
        required
      />

      {activeRules.length > 0 && (
        <Select
          label="Use a rule"
          value={ruleId}
          onChange={(event) => pickRule(event.target.value)}
          options={[
            { value: '', label: 'No rule, enter it by hand' },
            ...activeRules.map((r) => ({
              value: r.id,
              label: `${r.name} · ${formatAmount(r.amount_minor)} ${r.currency}`,
            })),
          ]}
          hint="Fills in the form. You can still edit it."
        />
      )}

      <Select
        label="What is it for?"
        value={kind}
        onChange={(event) => {
          setKind(event.target.value as FineKind);
          // A rule only goes with fines of its own kind.
          setRuleId('');
        }}
        options={FINE_KIND_OPTIONS}
        error={errors.kind}
      />

      {kind === 'late_payment' && (
        <Input
          label="Month paid late"
          type="month"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          error={errors.period}
          required
        />
      )}

      {kind === 'meeting_absence' && (
        <Select
          label="Meeting missed"
          value={meetingId}
          placeholder={meetings.isPending ? 'Loading meetings…' : 'Choose the meeting'}
          onChange={(event) => setMeetingId(event.target.value)}
          options={meetingOptions}
          error={errors.meeting ?? (meetings.error ? errorMessage(meetings.error) : undefined)}
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

      <Textarea
        label="Reason"
        placeholder="e.g. Paid the October contribution after the 10th"
        maxLength={255}
        rows={2}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        error={errors.reason}
        required
      />

      {errors.form && <p className="form-error">{errors.form}</p>}

      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" icon={<IconGavel />} disabled={issue.isPending}>
          {issue.isPending ? 'Issuing…' : 'Issue fine'}
        </Button>
      </div>
    </form>
  );
}
