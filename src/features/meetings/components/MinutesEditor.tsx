import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Button, Checkbox, IconPlus, IconTrash, Input, Select, Textarea } from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { useMemberships } from '@/features/members';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import {
  MINUTES_LIMITS,
  RESULT_LABEL,
  itemErrors,
  useCreateMinutes,
  useUpdateMinutes,
} from '../api/minutes';
import type {
  ActionItemInput,
  DecisionInput,
  DecisionResult,
  MinutesDetail,
  MinutesInput,
} from '../api/minutes';

type ResultChoice = DecisionResult | 'auto';

interface DecisionDraft {
  key: number;
  id?: string;
  title: string;
  detail: string;
  votesFor: string;
  votesAgainst: string;
  votesAbstain: string;
  result: ResultChoice;
}

interface ActionDraft {
  key: number;
  id?: string;
  title: string;
  assigneeId: string;
  /** Shown when the assignee is no longer an active member. */
  assigneeName?: string;
  dueDate: string;
  done: boolean;
}

const RESULT_OPTIONS: SelectOption[] = [
  { value: 'auto', label: 'Work it out from the votes' },
  { value: 'adopted', label: RESULT_LABEL.adopted },
  { value: 'rejected', label: RESULT_LABEL.rejected },
  { value: 'deferred', label: RESULT_LABEL.deferred },
];

let nextKey = 1;
const newKey = () => nextKey++;

const toVotes = (value: string) => (value.trim() === '' ? 0 : Number(value));
const votesValid = (value: string) =>
  value.trim() === '' ||
  (Number.isInteger(Number(value)) &&
    Number(value) >= 0 &&
    Number(value) <= MINUTES_LIMITS.votesMax);

/** What the backend would derive: adopted when more voted for than against. */
function derivedResult(d: Pick<DecisionDraft, 'votesFor' | 'votesAgainst' | 'votesAbstain'>) {
  const f = toVotes(d.votesFor);
  const a = toVotes(d.votesAgainst);
  const ab = toVotes(d.votesAbstain);
  if (!(f || a || ab)) return null;
  return f > a ? 'adopted' : 'rejected';
}

function decisionDrafts(minutes: MinutesDetail | null): DecisionDraft[] {
  return (minutes?.decisions ?? []).map((d) => {
    const draft = {
      key: newKey(),
      id: d.id,
      title: d.title,
      detail: d.detail ?? '',
      votesFor: String(d.votes_for),
      votesAgainst: String(d.votes_against),
      votesAbstain: String(d.votes_abstain),
    };
    // Keep "work it out" when that is what the votes give, so editing the
    // votes later updates the result; otherwise keep the chosen result.
    return { ...draft, result: derivedResult(draft) === d.result ? 'auto' : d.result };
  });
}

function actionDrafts(minutes: MinutesDetail | null): ActionDraft[] {
  return (minutes?.action_items ?? []).map((a) => ({
    key: newKey(),
    id: a.id,
    title: a.title,
    assigneeId: a.assignee?.membership_id ?? '',
    assigneeName: a.assignee?.full_name,
    dueDate: a.due_date ?? '',
    done: a.done,
  }));
}

const emptyDecision = (): DecisionDraft => ({
  key: newKey(),
  title: '',
  detail: '',
  votesFor: '',
  votesAgainst: '',
  votesAbstain: '',
  result: 'auto',
});

const emptyAction = (): ActionDraft => ({
  key: newKey(),
  title: '',
  assigneeId: '',
  dueDate: '',
  done: false,
});

interface Errors {
  discussion?: string;
  decisions?: string;
  decisionRows: Record<number, string>;
  actions?: string;
  actionRows: Record<number, string>;
  form?: string;
}

const NO_ERRORS: Errors = { decisionRows: {}, actionRows: {} };

/**
 * Write or edit draft minutes: the discussion notes, the decisions with their
 * votes, and the action items with who does them and by when. Saving sends
 * both lists whole; the backend keeps items by id, adds new ones and removes
 * the ones left out.
 */
export function MinutesEditor({
  meetingId,
  minutes,
  onCancel,
  onSaved,
}: {
  meetingId: string;
  /** null: start new minutes. */
  minutes: MinutesDetail | null;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const queryClient = useQueryClient();
  const create = useCreateMinutes();
  const update = useUpdateMinutes();
  const members = useMemberships(communityId, 'active');
  const [discussion, setDiscussion] = useState(minutes?.discussion ?? '');
  const [decisions, setDecisions] = useState<DecisionDraft[]>(() => decisionDrafts(minutes));
  const [actions, setActions] = useState<ActionDraft[]>(() => actionDrafts(minutes));
  const [errors, setErrors] = useState<Errors>(NO_ERRORS);
  const busy = create.isPending || update.isPending;

  const memberOptions = useMemo(
    () =>
      (members.data ?? [])
        .map((m) => ({ value: m.id, label: m.full_name ?? m.email ?? 'Member' }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [members.data],
  );

  function setDecision(key: number, patch: Partial<DecisionDraft>) {
    setDecisions((all) => all.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function setAction(key: number, patch: Partial<ActionDraft>) {
    setActions((all) => all.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  }

  function check(): Errors {
    const found: Errors = { decisionRows: {}, actionRows: {} };
    if (discussion.length > MINUTES_LIMITS.discussion) {
      found.discussion = `Keep the notes under ${MINUTES_LIMITS.discussion.toLocaleString('en-US')} characters.`;
    }
    decisions.forEach((d, index) => {
      const title = d.title.trim();
      if (title.length < MINUTES_LIMITS.titleMin) {
        found.decisionRows[index] = 'Say what was decided (at least 3 characters).';
      } else if (![d.votesFor, d.votesAgainst, d.votesAbstain].every(votesValid)) {
        found.decisionRows[index] = 'Votes must be whole numbers of 0 or more.';
      } else if (d.result === 'auto' && derivedResult(d) === null) {
        found.decisionRows[index] = 'Enter the votes, or choose the result.';
      }
    });
    actions.forEach((a, index) => {
      if (a.title.trim().length < MINUTES_LIMITS.titleMin) {
        found.actionRows[index] = 'Say what needs doing (at least 3 characters).';
      }
    });
    return found;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems = check();
    const hasProblems =
      problems.discussion !== undefined ||
      Object.keys(problems.decisionRows).length > 0 ||
      Object.keys(problems.actionRows).length > 0;
    setErrors(problems);
    if (hasProblems || !communityId) return;

    const body: MinutesInput = {
      discussion,
      decisions: decisions.map((d): DecisionInput => ({
        ...(d.id ? { id: d.id } : {}),
        title: d.title.trim(),
        detail: d.detail.trim() || null,
        votes_for: toVotes(d.votesFor),
        votes_against: toVotes(d.votesAgainst),
        votes_abstain: toVotes(d.votesAbstain),
        ...(d.result === 'auto' ? {} : { result: d.result }),
      })),
      action_items: actions.map((a): ActionItemInput => ({
        ...(a.id ? { id: a.id } : {}),
        title: a.title.trim(),
        assignee_id: a.assigneeId || null,
        due_date: a.dueDate || null,
        done: a.done,
      })),
    };

    const onError = (error: unknown) => {
      // Someone else started them meanwhile: load theirs.
      if (error instanceof ApiError && error.code === 'minutes_exist') {
        void queryClient.invalidateQueries({ queryKey: ['meetings', communityId, 'minutes'] });
      }
      const d = itemErrors(error, 'decisions');
      const a = itemErrors(error, 'action_items');
      const fields = error instanceof ApiError ? error.fieldErrors : {};
      const placed =
        d.list !== undefined ||
        a.list !== undefined ||
        Object.keys(d.rows).length > 0 ||
        Object.keys(a.rows).length > 0 ||
        fields.discussion !== undefined;
      setErrors({
        discussion: fields.discussion,
        decisions: d.list,
        decisionRows: d.rows,
        actions: a.list,
        actionRows: a.rows,
        form: placed
          ? 'Some items need fixing — see the messages below them.'
          : errorMessage(error),
      });
    };

    if (minutes) {
      update.mutate(
        { communityId, meetingId, ...body },
        { onSuccess: () => onSaved('Draft minutes saved.'), onError },
      );
    } else {
      create.mutate(
        { communityId, meetingId, ...body },
        {
          onSuccess: () =>
            onSaved(
              'Draft minutes started. Only the committee can see them until they are finalised.',
            ),
          onError,
        },
      );
    }
  }

  return (
    <form className="card minutes-editor" onSubmit={handleSubmit} noValidate>
      <header className="minutes-editor__head">
        <h2 className="section-title">{minutes ? 'Edit draft minutes' : 'Write minutes'}</h2>
        <p className="table__muted">
          A draft can be changed as often as needed. Once it is finalised it is shared with every
          member and can no longer be changed.
        </p>
      </header>

      <Textarea
        label="Notes"
        hint="What was discussed, in the order of the agenda."
        rows={8}
        maxLength={MINUTES_LIMITS.discussion}
        counter
        value={discussion}
        onChange={(event) => setDiscussion(event.target.value)}
        error={errors.discussion}
      />

      <fieldset className="minutes-editor__group">
        <legend className="field__label">Decisions</legend>
        <p className="table__muted minutes-editor__help">
          Each decision taken, with the votes. Leave the result on “Work it out from the votes” and
          it is adopted when more voted for than against.
        </p>
        {decisions.map((d, index) => {
          const auto = derivedResult(d);
          return (
            <div key={d.key} className="minutes-editor__item">
              <div className="minutes-editor__item-head">
                <span className="minutes-editor__number">Decision {index + 1}</span>
                <Button
                  variant="tint"
                  size="sm"
                  inline
                  icon={<IconTrash />}
                  aria-label={`Remove decision ${index + 1}`}
                  onClick={() => setDecisions((all) => all.filter((x) => x.key !== d.key))}
                >
                  Remove
                </Button>
              </div>
              <Input
                label="What was decided"
                placeholder="e.g. Approve the Q3 financial statement"
                maxLength={MINUTES_LIMITS.titleMax}
                value={d.title}
                onChange={(event) => setDecision(d.key, { title: event.target.value })}
              />
              <Textarea
                label="Details"
                optional
                rows={2}
                maxLength={MINUTES_LIMITS.detailMax}
                value={d.detail}
                onChange={(event) => setDecision(d.key, { detail: event.target.value })}
              />
              <div className="minutes-editor__votes">
                <Input
                  label="For"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={d.votesFor}
                  onChange={(event) => setDecision(d.key, { votesFor: event.target.value })}
                />
                <Input
                  label="Against"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={d.votesAgainst}
                  onChange={(event) => setDecision(d.key, { votesAgainst: event.target.value })}
                />
                <Input
                  label="Abstained"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={d.votesAbstain}
                  onChange={(event) => setDecision(d.key, { votesAbstain: event.target.value })}
                />
                <Select
                  label="Result"
                  options={RESULT_OPTIONS}
                  value={d.result}
                  onChange={(event) =>
                    setDecision(d.key, { result: event.target.value as ResultChoice })
                  }
                  hint={
                    d.result === 'auto' && auto !== null
                      ? `Comes out as: ${RESULT_LABEL[auto]}`
                      : undefined
                  }
                />
              </div>
              {errors.decisionRows[index] && (
                <p className="field__error" role="alert">
                  {errors.decisionRows[index]}
                </p>
              )}
            </div>
          );
        })}
        <div className="minutes-editor__foot">
          <Button
            variant="secondary"
            size="sm"
            inline
            icon={<IconPlus />}
            disabled={decisions.length >= MINUTES_LIMITS.decisions}
            onClick={() => setDecisions((all) => [...all, emptyDecision()])}
          >
            Add decision
          </Button>
        </div>
        {errors.decisions && <p className="field__error">{errors.decisions}</p>}
      </fieldset>

      <fieldset className="minutes-editor__group">
        <legend className="field__label">Action items</legend>
        <p className="table__muted minutes-editor__help">
          Work agreed at the meeting: who will do it and by when.
        </p>
        {members.isError && (
          <p className="table__muted">
            Could not load the member list, so you cannot choose who does each item right now.
          </p>
        )}
        {actions.map((a, index) => {
          const options =
            a.assigneeId && !memberOptions.some((o) => o.value === a.assigneeId)
              ? [
                  ...memberOptions,
                  {
                    value: a.assigneeId,
                    label: `${a.assigneeName ?? 'Former member'} (no longer active)`,
                  },
                ]
              : memberOptions;
          return (
            <div key={a.key} className="minutes-editor__item">
              <div className="minutes-editor__item-head">
                <span className="minutes-editor__number">Action {index + 1}</span>
                <Button
                  variant="tint"
                  size="sm"
                  inline
                  icon={<IconTrash />}
                  aria-label={`Remove action item ${index + 1}`}
                  onClick={() => setActions((all) => all.filter((x) => x.key !== a.key))}
                >
                  Remove
                </Button>
              </div>
              <Input
                label="What needs doing"
                placeholder="e.g. Share the signed statement with all members"
                maxLength={MINUTES_LIMITS.titleMax}
                value={a.title}
                onChange={(event) => setAction(a.key, { title: event.target.value })}
              />
              <div className="minutes-editor__action-row">
                <Select
                  label="Who"
                  options={[{ value: '', label: 'Nobody yet' }, ...options]}
                  value={a.assigneeId}
                  onChange={(event) => setAction(a.key, { assigneeId: event.target.value })}
                />
                <Input
                  label="Due date"
                  optional
                  type="date"
                  value={a.dueDate}
                  onChange={(event) => setAction(a.key, { dueDate: event.target.value })}
                />
              </div>
              <Checkbox
                label="Already done"
                checked={a.done}
                onChange={(event) => setAction(a.key, { done: event.target.checked })}
              />
              {errors.actionRows[index] && (
                <p className="field__error" role="alert">
                  {errors.actionRows[index]}
                </p>
              )}
            </div>
          );
        })}
        <div className="minutes-editor__foot">
          <Button
            variant="secondary"
            size="sm"
            inline
            icon={<IconPlus />}
            disabled={actions.length >= MINUTES_LIMITS.actionItems}
            onClick={() => setActions((all) => [...all, emptyAction()])}
          >
            Add action item
          </Button>
        </div>
        {errors.actions && <p className="field__error">{errors.actions}</p>}
      </fieldset>

      {errors.form && (
        <p className="form-error" role="alert">
          {errors.form}
        </p>
      )}
      <div className="review-actions minutes-editor__actions">
        <Button variant="tint" inline onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" inline disabled={busy}>
          {busy ? 'Saving…' : minutes ? 'Save draft' : 'Save as draft'}
        </Button>
      </div>
    </form>
  );
}
