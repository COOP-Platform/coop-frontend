import { EmptyState, ErrorState, IconUsers, LoadingState } from '@/components/ui';
import { errorMessage } from '@/lib/api/errors';
import { formatDate, formatShortDate } from '@/lib/format/date';

import { periodLabel, useMeetingReport, useRollCalls } from '../api/reports';
import type { AttendanceMark } from '../api/reports';

/** The same letters as the register PDF. */
const MARK: Record<AttendanceMark, { symbol: string; label: string }> = {
  present: { symbol: 'P', label: 'Present' },
  apology: { symbol: 'A', label: 'Apology (excused)' },
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
  const rollCalls = useRollCalls(
    communityId,
    locked.map((row) => row.meeting.id),
  );

  if (report.error) return <ErrorState message={errorMessage(report.error)} />;
  if (!report.data) return <LoadingState />;
  const data = report.data;
  const label = periodLabel(year, month);
  const open = data.rows.length - locked.length;

  if (locked.length === 0 || data.members.length === 0) {
    return (
      <EmptyState
        icon={<IconUsers />}
        title={`No attendance recorded for ${label}`}
        message={
          open > 0
            ? `${open} meeting${open === 1 ? ' has' : 's have'} a roll-call that is not locked yet. The register shows locked roll-calls only.`
            : 'Once a meeting has taken place and its roll-call is locked, it appears here.'
        }
      />
    );
  }

  const failed = rollCalls.find((query) => query.error);
  if (failed) return <ErrorState message={errorMessage(failed.error)} />;
  if (rollCalls.some((query) => !query.data)) return <LoadingState />;

  // marks[meetingId][membershipId]
  const marks = new Map<string, Map<string, AttendanceMark | null>>();
  for (const query of rollCalls) {
    if (!query.data) continue;
    marks.set(
      query.data.meeting_id,
      new Map(query.data.records.map((record) => [record.member.membership_id, record.status])),
    );
  }

  return (
    <section className="card table-card" aria-labelledby="register-title">
      <header className="table-card__head">
        <h2 id="register-title" className="section-head__title">
          Attendance register · {label}
        </h2>
        <p className="table__muted">
          {locked.length} meeting{locked.length === 1 ? '' : 's'} with a locked roll-call
          {open > 0 && `; ${open} still open and not shown`}.
        </p>
        <ul className="register-legend" aria-label="Key">
          {MARKS.map((mark) => (
            <li key={mark}>
              <span className={`register-mark register-mark--${mark}`} aria-hidden="true">
                {MARK[mark].symbol}
              </span>
              {MARK[mark].label}
            </li>
          ))}
          <li>
            <span className="register-mark register-mark--none" aria-hidden="true">
              –
            </span>
            Not on the roll-call
          </li>
        </ul>
      </header>
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
              <th scope="col" className="statement-table__num">
                Attended
              </th>
            </tr>
          </thead>
          <tbody>
            {data.members.map((entry) => (
              <tr key={entry.member.membership_id}>
                <th scope="row" className="register-table__member">
                  {entry.member.full_name}
                </th>
                {locked.map((row) => {
                  const mark = marks.get(row.meeting.id)?.get(entry.member.membership_id) ?? null;
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
                <td className="statement-table__num">
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
    </section>
  );
}
