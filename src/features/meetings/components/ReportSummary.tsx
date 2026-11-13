import {
  Badge,
  EmptyState,
  ErrorState,
  IconBarChart,
  IconCalendar,
  IconCheckCircle,
  IconClose,
  IconUsers,
  LoadingState,
  StatCard,
} from '@/components/ui';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import { MEETING_TYPE_LABEL, periodLabel, useMeetingReport } from '../api/reports';
import type { AttendanceReportRow, MeetingType } from '../api/reports';

const TYPES: MeetingType[] = ['general', 'committee', 'emergency', 'agm'];

/**
 * The period at a glance: meetings held and cancelled, average attendance and
 * quorum (from the attendance report, locked roll-calls only), meetings by
 * status and type (from the meetings report), and attendance at each meeting.
 */
export function ReportSummary({
  communityId,
  year,
  month,
}: {
  communityId: string;
  year: number;
  month: number | null;
}) {
  const meetings = useMeetingReport(communityId, 'meetings', year, month);
  const attendance = useMeetingReport(communityId, 'attendance', year, month);

  const error = meetings.error ?? attendance.error;
  if (error) return <ErrorState message={errorMessage(error)} />;
  if (!meetings.data || !attendance.data) return <LoadingState />;
  const m = meetings.data.summary;
  const a = attendance.data.summary;
  const label = periodLabel(year, month);

  if (m.total === 0) {
    return (
      <EmptyState
        icon={<IconCalendar />}
        title={`No meetings in ${label}`}
        message="Choose another year or month to see its meetings."
      />
    );
  }

  return (
    <div className="money-section">
      <div className="stat-grid stat-grid--four">
        <StatCard
          label="Meetings held"
          value={a.meetings}
          caption={`${a.recorded} with attendance recorded`}
          icon={<IconCheckCircle />}
        />
        <StatCard
          label="Cancelled"
          value={m.cancelled}
          caption={`of ${m.total} scheduled in ${label}`}
          icon={<IconClose />}
          tone="neutral"
        />
        <StatCard
          label="Average attendance"
          value={a.average_attendance === null ? '—' : `${a.average_attendance}%`}
          caption={a.recorded ? 'Over locked roll-calls' : 'No roll-call locked yet'}
          icon={<IconUsers />}
          tone="info"
        />
        <StatCard
          label="Quorum reached"
          value={`${a.quorum_met} of ${a.recorded}`}
          caption="Meetings with a locked roll-call"
          icon={<IconBarChart />}
          tone="warning"
        />
      </div>

      <div className="report-summary-grid">
        <section className="card table-card" aria-labelledby="summary-status">
          <header className="table-card__head">
            <h2 id="summary-status" className="section-head__title">
              Meetings by status
            </h2>
          </header>
          <table className="table table--compact">
            <tbody>
              <CountRow label="Completed" value={m.completed} />
              <CountRow label="Upcoming or in progress" value={m.upcoming} />
              <CountRow label="Cancelled" value={m.cancelled} />
            </tbody>
            <tfoot>
              <CountRow label="Total" value={m.total} />
            </tfoot>
          </table>
        </section>
        <section className="card table-card" aria-labelledby="summary-type">
          <header className="table-card__head">
            <h2 id="summary-type" className="section-head__title">
              Meetings by type
            </h2>
          </header>
          <table className="table table--compact">
            <tbody>
              {TYPES.map((type) => (
                <CountRow key={type} label={MEETING_TYPE_LABEL[type]} value={m.by_type[type]} />
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <MeetingAttendanceTable rows={attendance.data.rows} />
    </div>
  );
}

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className="statement-table__num">{value}</td>
    </tr>
  );
}

function MeetingAttendanceTable({ rows }: { rows: AttendanceReportRow[] }) {
  return (
    <section className="card table-card" aria-labelledby="summary-meetings">
      <header className="table-card__head">
        <h2 id="summary-meetings" className="section-head__title">
          Attendance at each meeting
        </h2>
        <p className="table__muted">
          Meetings that have taken place. A roll-call that is still open may change.
        </p>
      </header>
      {rows.length === 0 ? (
        <p className="table-card__foot">No meeting has taken place in this period yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="table table--compact">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Meeting</th>
                <th scope="col" className="statement-table__num">
                  Present
                </th>
                <th scope="col" className="statement-table__num">
                  Apologies
                </th>
                <th scope="col" className="statement-table__num">
                  Absent
                </th>
                <th scope="col">Attendance</th>
                <th scope="col">Quorum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.meeting.id}>
                  <td className="statement-table__date">{formatDate(row.meeting.scheduled_at)}</td>
                  <td>
                    <span className="table__stack">
                      <span>{row.meeting.title}</span>
                      <span className="table__muted">
                        {MEETING_TYPE_LABEL[row.meeting.meeting_type]}
                      </span>
                    </span>
                  </td>
                  <td className="statement-table__num">
                    {row.present} of {row.expected}
                  </td>
                  <td className="statement-table__num">{row.apology}</td>
                  <td className="statement-table__num">{row.absent}</td>
                  <td>
                    <span className="report-bar">
                      <span className="report-bar__track" aria-hidden="true">
                        <span
                          className={
                            row.quorum_reached
                              ? 'report-bar__fill'
                              : 'report-bar__fill report-bar__fill--short'
                          }
                          style={{ width: `${Math.min(row.percent, 100)}%` }}
                        />
                      </span>
                      <span className="report-bar__value">{row.percent}%</span>
                    </span>
                  </td>
                  <td>
                    {!row.locked ? (
                      <Badge tone="neutral">Roll-call open</Badge>
                    ) : row.quorum_reached ? (
                      <Badge tone="success">Reached ({row.threshold}%)</Badge>
                    ) : (
                      <Badge tone="warning">Not reached ({row.threshold}%)</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
