import {
  EmptyState,
  ErrorState,
  IconUsers,
  LoadingState,
  SectionCard,
  TableFooter,
  usePaged,
} from '@/components/ui';
import { errorMessage } from '@/lib/api/errors';
import { formatDate, formatShortDate } from '@/lib/format/date';

import { periodLabel, useMeetingReport } from '../api/reports';
import type { AttendanceMark } from '../api/reports';

/** The same letters as the register PDF. */
const MARK: Record<AttendanceMark, { symbol: string; label: string }> = {
  present: { symbol: 'P', label: 'Present' },
  apology: { symbol: 'A', label: 'Apology' },
  absent: { symbol: 'X', label: 'Absent' },
};

const MARKS: AttendanceMark[] = ['present', 'apology', 'absent'];

/**
 * Members (rows) by meetings (columns): each member's mark at every meeting of
 * the period whose roll-call is locked, and their attendance rate. Open
 * roll-calls are left out, as on the PDF: they may still change.
 */
export function AttendanceRegister({
  communityId,
  year,
  month,
}: {
  communityId: string;
  year: number;
  month: number | null;
}) {
  const report = useMeetingReport(communityId, 'attendance', year, month);
  const locked = (report.data?.rows ?? []).filter((row) => row.locked);
  const paged = usePaged(report.data?.members ?? []);

  if (report.error) return <ErrorState message={errorMessage(report.error)} />;
  if (!report.data) return <LoadingState />;
  const data = report.data;
  const label = periodLabel(year, month);
  const open = data.rows.length - locked.length;

  if (locked.length === 0 || data.members.length === 0) {
    return (
      <SectionCard title={`Register · ${label}`}>
        <EmptyState
          icon={<IconUsers />}
          title="No locked roll-calls"
          message={open > 0 ? `${open} roll-call${open === 1 ? '' : 's'} still open.` : undefined}
        />
      </SectionCard>
    );
  }

  // marks[membershipId][meetingId], all from the one attendance report.
  const marks = new Map<string, Map<string, AttendanceMark>>(
    data.members.map((entry) => [
      entry.member.membership_id,
      new Map(entry.marks.map((mark) => [mark.meeting_id, mark.status])),
    ]),
  );

  return (
    <SectionCard
      title={`Register · ${label}`}
      flush
      actions={
        <ul className="register-legend" aria-label="Key">
          {MARKS.map((mark) => (
            <li key={mark}>
              <span className={`register-mark register-mark--${mark}`} aria-hidden="true">
                {MARK[mark].symbol}
              </span>
              {MARK[mark].label}
            </li>
          ))}
        </ul>
      }
      footer={
        <>
          <TableFooter {...paged} onPage={paged.setPage} />
          {open > 0 && (
            <span className="table__muted">
              {open} open roll-call{open === 1 ? '' : 's'} not shown
            </span>
          )}
        </>
      }
    >
      <div className="table-scroll register-scroll" tabIndex={0} aria-label="Register table">
        <table className="table table--compact register-table">
          <thead>
            <tr>
              <th scope="col" className="register-table__member">
                Member
              </th>
              {locked.map((row) => (
                <th
                  key={row.meeting.id}
                  scope="col"
                  className="register-table__meeting"
                  title={`${row.meeting.title}, ${formatDate(row.meeting.scheduled_at)}`}
                >
                  <span className="register-table__date">
                    {formatShortDate(row.meeting.scheduled_at)}
                  </span>
                  <span className="register-table__title">{row.meeting.title}</span>
                </th>
              ))}
              <th scope="col" className="num">
                Attended
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((entry) => (
              <tr key={entry.member.membership_id}>
                <th scope="row" className="register-table__member">
                  {entry.member.full_name}
                </th>
                {locked.map((row) => {
                  const mark = marks.get(entry.member.membership_id)?.get(row.meeting.id) ?? null;
                  return (
                    <td key={row.meeting.id} className="register-table__cell">
                      <span
                        className={`register-mark register-mark--${mark ?? 'none'}`}
                        aria-hidden="true"
                      >
                        {mark ? MARK[mark].symbol : '–'}
                      </span>
                      <span className="visually-hidden">
                        {mark ? MARK[mark].label : 'Not on the roll-call'}
                      </span>
                    </td>
                  );
                })}
                <td className="num">
                  <strong>{entry.percent}%</strong>
                  <span className="table__muted register-table__count">
                    {' '}
                    {entry.present} of {entry.meetings}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
