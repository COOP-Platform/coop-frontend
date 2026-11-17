import { useState } from 'react';

import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  IconCheckCircle,
  IconGavel,
  LoadingState,
  SectionCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import { useFineSuggestions, useIssueFine } from '../../api/fines';
import type { FineSuggestion } from '../../api/fines';
import { Money } from '../Money';
import { FINE_KIND_LABEL, fineSentence } from './fine-text';

type RowResult = { ok: true } | { ok: false; message: string };

/**
 * What the active rules say is due and nobody has fined yet. Tick the ones
 * to issue; anything left unticked is simply not fined. A suggestion
 * disappears once its fine is issued.
 */
export function SuggestedFines() {
  const { communityId } = useWorkspace();
  const suggestions = useFineSuggestions(communityId);
  const issue = useIssueFine();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // Results stay after the list refreshes, so the issued ones are still reported.
  const [results, setResults] = useState<Map<string, { row: FineSuggestion; result: RowResult }>>(
    new Map(),
  );
  const [busy, setBusy] = useState(false);

  const items = suggestions.data?.items ?? [];
  const issuedRows = [...results.values()].filter((r) => r.result.ok);

  function toggle(key: string, on: boolean) {
    setPicked((current) => {
      const next = new Set(current);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  async function issueSelected() {
    if (communityId === undefined) return;
    setBusy(true);
    const chosen = items.filter((row) => picked.has(row.key));
    const next = new Map(results);
    // One at a time: each POST stands alone, and a refusal names its own row.
    for (const row of chosen) {
      try {
        await issue.mutateAsync({
          communityId,
          membership_id: row.member.membership_id,
          kind: row.kind,
          amount_minor: row.amount_minor,
          reason: row.reason,
          rule_id: row.rule.id,
          period_year: row.period_year ?? undefined,
          period_month: row.period_month ?? undefined,
          meeting_id: row.meeting?.id,
        });
        next.set(row.key, { row, result: { ok: true } });
      } catch (failure) {
        const message =
          failure instanceof ApiError && failure.code === 'already_fined'
            ? 'Already fined for this.'
            : errorMessage(failure);
        next.set(row.key, { row, result: { ok: false, message } });
      }
    }
    setResults(next);
    setPicked(new Set());
    setBusy(false);
  }

  return (
    <SectionCard
      title={
        <>Suggested fines {items.length > 0 && <Badge tone="warning">{items.length}</Badge>}</>
      }
      flush
      footer={
        items.length > 0 ? (
          <>
            <span>{picked.size === 0 ? 'Nothing selected' : `${picked.size} selected`}</span>
            <Button
              inline
              icon={<IconGavel />}
              disabled={picked.size === 0 || busy}
              onClick={() => void issueSelected()}
            >
              {busy ? 'Issuing…' : 'Issue selected'}
            </Button>
          </>
        ) : undefined
      }
    >
      {issuedRows.length > 0 && (
        <div className="notice notice--success fines__notice" role="status">
          <IconCheckCircle width={20} height={20} aria-hidden="true" />
          <div>
            <p className="notice__title">
              {issuedRows.length} fine{issuedRows.length === 1 ? '' : 's'} issued
            </p>
            <p className="notice__text">
              {issuedRows.map(({ row }) => `${row.member.full_name}`).join(', ')}
            </p>
          </div>
        </div>
      )}

      {suggestions.isPending ? (
        <LoadingState label="Checking the rules…" />
      ) : suggestions.error ? (
        <ErrorState
          title="Couldn't load suggested fines"
          message={errorMessage(suggestions.error)}
        />
      ) : items.length === 0 ? (
        <EmptyState icon={<IconGavel width={28} height={28} />} title="No fines to suggest" />
      ) : (
        <>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col" className="fines__check-col">
                    <Checkbox
                      label="Select all"
                      labelHidden
                      checked={picked.size === items.length}
                      onChange={(event) =>
                        setPicked(
                          event.target.checked ? new Set(items.map((r) => r.key)) : new Set(),
                        )
                      }
                    />
                  </th>
                  <th scope="col">Member</th>
                  <th scope="col">Fine</th>
                  <th scope="col" className="num">
                    Amount
                  </th>
                  <th scope="col">Rule</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const failed = results.get(row.key)?.result;
                  return (
                    <tr key={row.key}>
                      <td className="fines__check-col">
                        <Checkbox
                          label={`Issue to ${row.member.full_name}: ${fineSentence(row)}`}
                          labelHidden
                          checked={picked.has(row.key)}
                          onChange={(event) => toggle(row.key, event.target.checked)}
                        />
                      </td>
                      <td>{row.member.full_name}</td>
                      <td>
                        <span className="table__stack">
                          <span>{fineSentence(row)}</span>
                          <span className="table__muted">{FINE_KIND_LABEL[row.kind]}</span>
                          {failed && !failed.ok && (
                            <span className="table__warn" role="alert">
                              {failed.message}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="num">
                        <Money minor={row.amount_minor} />
                      </td>
                      <td>{row.rule.name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </SectionCard>
  );
}
