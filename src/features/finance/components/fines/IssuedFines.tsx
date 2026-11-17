import { useState } from 'react';

import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  IconBan,
  IconGavel,
  IconPlusCircle,
  LoadingState,
  SectionCard,
  Select,
  TableFooter,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import { useFines, useWaiveFine } from '../../api/fines';
import type { Fine, FineFilters, FineStatus } from '../../api/fines';
import { formatAmount } from '../../format';
import { Money } from '../Money';
import { ReasonPrompt } from '../ReasonPrompt';
import { SuccessNotice } from '../SuccessNotice';
import { IssueFineDialog } from './IssueFineDialog';
import { fineSentence, fineStatus } from './fine-text';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | FineStatus;
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'issued', label: 'Issued' },
  { value: 'waived', label: 'Waived' },
];

/** Every fine issued, with what is still owed; waive one with a reason. */
export function IssuedFines() {
  const { communityId } = useWorkspace();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [outstanding, setOutstanding] = useState(false);
  const [page, setPage] = useState(1);
  const [issuing, setIssuing] = useState(false);
  const [waiving, setWaiving] = useState<Fine | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const waive = useWaiveFine();

  const filters: FineFilters = {
    status: status === 'all' ? undefined : status,
    outstanding: outstanding || undefined,
    page,
    page_size: PAGE_SIZE,
  };
  const fines = useFines(communityId, filters);
  const data = fines.data;
  const filtered = status !== 'all' || outstanding;

  return (
    <SectionCard
      title={
        <>
          Issued fines{' '}
          {data && data.total_outstanding_minor > 0 && (
            <Badge tone="warning">RWF {formatAmount(data.total_outstanding_minor)} unpaid</Badge>
          )}
        </>
      }
      flush
      actions={
        <>
          <Select
            label="Status"
            labelHidden
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as StatusFilter);
              setPage(1);
            }}
            options={STATUS_OPTIONS}
          />
          <Checkbox
            label="Unpaid only"
            checked={outstanding}
            onChange={(event) => {
              setOutstanding(event.target.checked);
              setPage(1);
            }}
          />
          <Button inline icon={<IconPlusCircle />} onClick={() => setIssuing(true)}>
            Issue a fine
          </Button>
        </>
      }
      footer={
        data && data.items.length > 0 ? (
          <TableFooter
            from={(data.page - 1) * data.page_size + 1}
            to={(data.page - 1) * data.page_size + data.items.length}
            total={data.total}
            page={data.page}
            pageCount={Math.max(1, Math.ceil(data.total / data.page_size))}
            onPage={setPage}
          />
        ) : undefined
      }
    >
      {done && (
        <div className="fines__notice">
          <SuccessNotice text={done} />
        </div>
      )}

      {data === undefined ? (
        fines.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState title="Couldn't load fines" message={errorMessage(fines.error)} />
        )
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={<IconGavel width={28} height={28} />}
          title={filtered ? 'No matching fines' : 'No fines yet'}
        />
      ) : (
        <>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Fine</th>
                  <th scope="col" className="num">
                    Paid
                  </th>
                  <th scope="col" className="num">
                    Left
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col" className="table__action-col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((fine) => {
                  const badge = fineStatus(fine);
                  return (
                    <tr key={fine.id}>
                      <td>{fine.member.full_name}</td>
                      <td>
                        <span className="table__stack">
                          <span>{fineSentence(fine)}</span>
                          <span className="table__muted">
                            {fine.kind !== 'other' && `${fine.reason} · `}
                            {formatDate(fine.created_at)} by {fine.issued_by.full_name}
                            {fine.status === 'waived' &&
                              ` · Waived${fine.waived_by ? ` by ${fine.waived_by.full_name}` : ''}${
                                fine.waive_reason ? `: ${fine.waive_reason}` : ''
                              }`}
                          </span>
                        </span>
                      </td>
                      <td className="num">{formatAmount(fine.paid_minor)}</td>
                      <td className="num">
                        <Money minor={fine.outstanding_minor} currency={fine.currency} />
                      </td>
                      <td>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                        {fine.pending_minor > 0 && badge.tone === 'danger' && (
                          <span className="fines__note">
                            {formatAmount(fine.pending_minor)} pending
                          </span>
                        )}
                      </td>
                      <td className="table__action-col">
                        {fine.status === 'issued' && !fine.is_paid && (
                          <button
                            type="button"
                            className="link-action"
                            onClick={() => setWaiving(fine)}
                            aria-label={`Waive: ${fine.member.full_name}, ${fineSentence(fine)}`}
                          >
                            Waive
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <IssueFineDialog
        open={issuing}
        onClose={() => setIssuing(false)}
        onIssued={(fine) => {
          setIssuing(false);
          setDone(`${fineSentence(fine)} issued to ${fine.member.full_name}.`);
        }}
      />

      <ReasonPrompt
        open={waiving !== null}
        title="Waive this fine"
        subtitle="The member will no longer owe it."
        icon={<IconBan />}
        about={waiving ? `${waiving.member.full_name} · ${fineSentence(waiving)}` : ''}
        placeholder="e.g. Agreed at the meeting: they were travelling"
        confirmLabel="Waive fine"
        busy={waive.isPending}
        onClose={() => setWaiving(null)}
        onSubmit={async (reason) => {
          if (waiving === null || communityId === undefined) return;
          await waive.mutateAsync({ communityId, fineId: waiving.id, reason });
          setDone(`${waiving.member.full_name}'s fine is waived.`);
          setWaiving(null);
        }}
      />
    </SectionCard>
  );
}
