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
  SectionCard,
  StatCard,
  TableFooter,
  usePaged,
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
      <SectionCard title="Summary">
        <EmptyState icon={<IconCalendar />} title={`No meetings in ${label}`} />
      </SectionCard>
    );
  }

  return (
    <div className="report-summary">
      <div className="stat-grid">
        <StatCard
          label="Meetings held"
          value={a.meetings}
          caption={`${a.recorded} recorded`}
          icon={<IconCheckCircle />}
        />
        <StatCard
          label="Cancelled"
          value={m.cancelled}
          caption={`of ${m.total} scheduled`}
          icon={<IconClose />}
          tone="danger"
        />
        <StatCard
          label="Average attendance"
          value={a.average_attendance === null ? '—' : `${a.average_attendance}%`}
          caption={a.recorded ? undefined : 'No locked roll-calls'}
          icon={<IconUsers />}
          tone="info"
        />
        <StatCard
          label="Quorum reached"
          value={`${a.quorum_met} of ${a.recorded}`}
          icon={<IconBarChart />}
          tone="warning"
        />
      </div>

      <div className="report-summary-grid">
        <SectionCard title="By status" flush>
          <div className="table-scroll">
            <table className="table table--compact">
              <tbody>
                <CountRow label="Completed" value={m.completed} />
                <CountRow label="Upcoming" value={m.upcoming} />
                <CountRow label="Cancelled" value={m.cancelled} />
              </tbody>
              <tfoot>
                <CountRow label="Total" value={m.total} />
              </tfoot>
            </table>
          </div>
        </SectionCard>
        <SectionCard title="By type" flush>
          <div className="table-scroll">
            <table className="table table--compact">
              <tbody>
                {TYPES.map((type) => (
                  <CountRow key={type} label={MEETING_TYPE_LABEL[type]} value={m.by_type[type]} />
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <MeetingAttendanceTable rows={attendance.data.rows} />
    </div>
  );
}

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className="num">{value}</td>
    </tr>
  );
}

function MeetingAttendanceTable({ rows }: { rows: AttendanceReportRow[] }) {
  const paged = usePaged(rows);
  return (
    <SectionCard
      title="Attendance by meeting"
      flush={rows.length > 0}
      footer={rows.length > 0 ? <TableFooter {...paged} onPage={paged.setPage} /> : undefined}
    >
      {rows.length === 0 ? (
        <p className="table__muted">No meetings held yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="table table--compact">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Meeting</th>
                <th scope="col" className="num">
                  Present
                </th>
                <th scope="col" className="num">
                  Apologies
                </th>
                <th scope="col" className="num">
                  Absent
                </th>
                <th scope="col">Rate</th>
                <th scope="col">Quorum</th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((row) => (
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
                  <td className="num">
                    {row.present} of {row.expected}
                  </td>
                  <td className="num">{row.apology}</td>
                  <td className="num">{row.absent}</td>
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
                      <Badge tone="neutral">Open</Badge>
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
    </SectionCard>
  );
}
