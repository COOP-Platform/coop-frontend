import { useState } from 'react';
import type { FormEvent } from 'react';

import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  IconAlertTriangle,
  IconCalendar,
  IconLock,
  IconRefresh,
  IconTile,
  LoadingState,
  Textarea,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import { pendingItems, useCloseYear, useFinancialYears, useReopenYear } from '../../api/years';
import type { FinancialYear, PendingCounts, YearSummary } from '../../api/years';
import type { ContributionType } from '../../api/types';
import type { IncomeSource } from '../../api/income';
import { INCOME_SOURCE, TYPE_LABEL, humanize } from '../../labels';
import { Money } from '../Money';
import { ReasonPrompt } from '../ReasonPrompt';
import { SectionHeader } from '../SectionHeader';
import { SuccessNotice } from '../SuccessNotice';

const THIS_YEAR = new Date().getFullYear();

/**
 * Year-end close: every year the community has kept money in, open or
 * closed. Closing a finished year freezes it (nothing dated in it can be
 * added, changed or reversed) and keeps its figures for the General Assembly.
 */
export function YearsPanel({ embedded = false }: { embedded?: boolean }) {
  const { communityId, can } = useWorkspace();
  const canClose = can('finance.year.close');
  const years = useFinancialYears(communityId);
  const [closing, setClosing] = useState<FinancialYear | null>(null);
  const [reopening, setReopening] = useState<FinancialYear | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const reopen = useReopenYear();

  if (years.data === undefined) {
    return years.isPending ? <LoadingState /> : <ErrorState message={errorMessage(years.error)} />;
  }
  const items = years.data.items;

  return (
    <div className="page">
      <SectionHeader embedded={embedded} title="Financial years" />

      {notice && <SuccessNotice text={notice} />}

      {items.length === 0 ? (
        <EmptyState icon={<IconCalendar width={28} height={28} />} title="No years yet" />
      ) : (
        <ul className="years" aria-label="Financial years">
          {items.map((item) => (
            <li key={item.year}>
              <YearCard
                item={item}
                canClose={canClose}
                onClose={() => {
                  setNotice(null);
                  setClosing(item);
                }}
                onReopen={() => {
                  setNotice(null);
                  setReopening(item);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <CloseYearDialog
        item={closing}
        onClose={() => setClosing(null)}
        onClosed={(year) => {
          setClosing(null);
          setNotice(`${year} is closed.`);
        }}
      />

      {communityId && (
        <ReasonPrompt
          open={reopening !== null}
          title={reopening ? `Reopen ${reopening.year}` : 'Reopen year'}
          subtitle="Its records can be changed again."
          icon={<IconRefresh />}
          about={
            reopening
              ? `${reopening.year}, closed ${reopening.closed_at ? formatDate(reopening.closed_at) : ''}`
              : ''
          }
          placeholder="e.g. A payment from December was missed."
          confirmLabel="Reopen year"
          busy={reopen.isPending}
          onClose={() => setReopening(null)}
          onSubmit={(reason) => {
            const year = reopening?.year;
            if (year === undefined) return Promise.resolve();
            return reopen.mutateAsync({ communityId, year, reason }).then(() => {
              setReopening(null);
              setNotice(`${year} is open again.`);
            });
          }}
        />
      )}
    </div>
  );
}

function YearCard({
  item,
  canClose,
  onClose,
  onReopen,
}: {
  item: FinancialYear;
  canClose: boolean;
  onClose: () => void;
  onReopen: () => void;
}) {
  const closed = item.status === 'closed';
  const over = item.year < THIS_YEAR;
  const titleId = `year-${item.year}-title`;

  return (
    <section className="card years__card" aria-labelledby={titleId}>
      <header className="years__head">
        <div>
          <h3 id={titleId} className="years__title">
            {item.year}
          </h3>
          <p className="table__muted">
            {closed
              ? `Closed${item.closed_by ? ` by ${item.closed_by.full_name}` : ''}${item.closed_at ? ` on ${formatDate(item.closed_at)}` : ''}`
              : over
                ? 'Not closed yet'
                : 'Running'}
          </p>
        </div>
        <Badge tone={closed ? 'neutral' : 'success'}>{closed ? 'Closed' : 'Open'}</Badge>
      </header>

      {item.pending_count > 0 && (
        <p className="years__warning" role="note">
          <IconAlertTriangle width={18} height={18} aria-hidden="true" />
          <span>
            {item.pending_count} record{item.pending_count === 1 ? '' : 's'} pending
            {!closed && over ? '. Decide before closing.' : ''}
          </span>
        </p>
      )}

      {item.note && <p className="details__note">{item.note}</p>}

      {closed && item.summary && <YearFigures summary={item.summary} />}

      {canClose && (closed || over) && (
        <div className="review-actions">
          {closed ? (
            <Button variant="secondary" inline icon={<IconRefresh />} onClick={onReopen}>
              Reopen year
            </Button>
          ) : (
            <Button inline icon={<IconLock />} onClick={onClose}>
              Close {item.year}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

/** What the closed year came to, as it stood at closing. */
function YearFigures({ summary }: { summary: YearSummary }) {
  const { currency, money_in: moneyIn, money_out: moneyOut } = summary;
  const breakdown = [
    ...Object.entries(moneyIn.contributions_by_type).map(([key, minor]) => ({
      group: 'In',
      label: TYPE_LABEL[key as ContributionType] ?? humanize(key),
      minor,
    })),
    ...Object.entries(moneyIn.income_by_source).map(([key, minor]) => ({
      group: 'In',
      label: `Income: ${INCOME_SOURCE[key as IncomeSource] ?? humanize(key)}`,
      minor,
    })),
    ...Object.entries(moneyOut.expenses_by_category).map(([key, minor]) => ({
      group: 'Out',
      label: `Expenses: ${humanize(key)}`,
      minor,
    })),
  ];

  return (
    <div className="years__figures">
      <dl className="years__totals">
        <Figure label="Money in" minor={moneyIn.total_minor} currency={currency} />
        <Figure label="Money out" minor={moneyOut.total_minor} currency={currency} />
        <Figure label="Net" minor={summary.net_minor} currency={currency} />
        <Figure label="Closing balance" minor={summary.closing_balance_minor} currency={currency} />
      </dl>
      <p className="table__muted">
        Contributions <Money minor={moneyIn.contributions_minor} currency={currency} /> · Other
        income <Money minor={moneyIn.income_minor} currency={currency} />
        {summary.members_with_outstanding > 0 && (
          <>
            {' '}
            · {summary.members_with_outstanding} member
            {summary.members_with_outstanding === 1 ? '' : 's'} still owed{' '}
            <Money minor={summary.outstanding_minor} currency={currency} /> for the year
          </>
        )}
      </p>
      {breakdown.length > 0 && (
        <details className="years__breakdown">
          <summary>Breakdown</summary>
          <table className="table">
            <tbody>
              {breakdown.map((row) => (
                <tr key={`${row.group}-${row.label}`}>
                  <td>{row.label}</td>
                  <td className="years__amount">
                    {row.group === 'Out' ? '−' : ''}
                    <Money minor={row.minor} currency={currency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}

function Figure({ label, minor, currency }: { label: string; minor: number; currency: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <Money minor={minor} currency={currency} />
      </dd>
    </div>
  );
}

const PENDING_LABEL: Record<keyof PendingCounts, [string, string]> = {
  contributions: ['payment to confirm', 'payments to confirm'],
  expenses: ['expense to approve', 'expenses to approve'],
  income: ['income entry to approve', 'income entries to approve'],
};

/** Confirm closing a year, with an optional note for the record. */
function CloseYearDialog({
  item,
  onClose,
  onClosed,
}: {
  item: FinancialYear | null;
  onClose: () => void;
  onClosed: (year: number) => void;
}) {
  return (
    <Dialog
      open={item !== null}
      onClose={onClose}
      title={item ? `Close ${item.year}` : 'Close year'}
      subtitle="Nothing dated in it can be added, changed or reversed after this."
      icon={
        <IconTile tone="warning" round>
          <IconLock />
        </IconTile>
      }
    >
      {item && <CloseYearForm item={item} onCancel={onClose} onClosed={onClosed} />}
    </Dialog>
  );
}

function CloseYearForm({
  item,
  onCancel,
  onClosed,
}: {
  item: FinancialYear;
  onCancel: () => void;
  onClosed: (year: number) => void;
}) {
  const { communityId } = useWorkspace();
  const close = useCloseYear();
  const [note, setNote] = useState('');
  const pending = pendingItems(close.error);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (communityId === undefined) return;
    close.mutate(
      { communityId, year: item.year, note: note.trim() || undefined },
      { onSuccess: () => onClosed(item.year) },
    );
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      <Textarea
        label="Note"
        optional
        placeholder="e.g. Presented to the General Assembly on 20 January."
        maxLength={255}
        rows={3}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      {close.error && (
        <div className="form-error" role="alert">
          <p>{errorMessage(close.error)}</p>
          {pending && (
            <ul className="years__pending-list">
              {(Object.keys(PENDING_LABEL) as (keyof PendingCounts)[])
                .filter((key) => pending[key] > 0)
                .map((key) => (
                  <li key={key}>
                    {pending[key]} {PENDING_LABEL[key][pending[key] === 1 ? 0 : 1]}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" icon={<IconLock />} disabled={close.isPending}>
          {close.isPending ? 'Closing…' : `Close ${item.year}`}
        </Button>
      </div>
    </form>
  );
}
