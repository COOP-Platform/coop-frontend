import { useState } from 'react';

import {
  Button,
  EmptyState,
  IconDownload,
  IconLock,
  PageHeader,
  SegmentedControl,
  Select,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';

import { MIN_REPORT_YEAR, MONTH_NAMES, downloadAttendanceRegister } from '../api/reports';
import { AttendanceRegister } from './AttendanceRegister';
import { ReportSummary } from './ReportSummary';

export type MeetingReportsTab = 'register' | 'summary';

const TABS: { value: MeetingReportsTab; label: string }[] = [
  { value: 'register', label: 'Attendance register' },
  { value: 'summary', label: 'Summary' },
];

/**
 * Meetings & Events reports (backend S3-14): the attendance register (who came
 * to which meeting) and a summary of the period's meetings, for a calendar
 * year or one month of it, with the register as a PDF. Every member reads
 * them (meeting.view).
 */
export function ReportsPage({
  tab,
  onTabChange,
}: {
  tab: MeetingReportsTab;
  onTabChange: (tab: MeetingReportsTab) => void;
}) {
  const { communityId, can } = useWorkspace();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const years: number[] = [];
  for (let y = thisYear; y >= MIN_REPORT_YEAR; y -= 1) years.push(y);

  async function download() {
    if (!communityId) return;
    setDownloadError(null);
    setBusy(true);
    try {
      await downloadAttendanceRegister(communityId, year, month);
    } catch (error) {
      setDownloadError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (!can('meeting.view')) {
    return (
      <div className="page">
        <PageHeader title="Reports" />
        <EmptyState
          icon={<IconLock />}
          title="You cannot see meeting reports"
          message="Ask a committee member if you think you should."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={<span className="eyebrow eyebrow--muted">Meetings & Events</span>}
        title="Reports"
        subtitle="Who came to which meeting, and how the period's meetings went."
        actions={
          <>
            <Select
              label="Year"
              value={String(year)}
              onChange={(event) => setYear(Number(event.target.value))}
              options={years.map((y) => ({ value: String(y), label: String(y) }))}
            />
            <Select
              label="Month"
              value={month === null ? '' : String(month)}
              onChange={(event) =>
                setMonth(event.target.value === '' ? null : Number(event.target.value))
              }
              options={[
                { value: '', label: 'Whole year' },
                ...MONTH_NAMES.map((name, index) => ({ value: String(index + 1), label: name })),
              ]}
            />
            <Button
              variant="secondary"
              inline
              icon={<IconDownload />}
              disabled={busy}
              onClick={() => void download()}
            >
              {busy ? 'Preparing…' : 'Register (PDF)'}
            </Button>
          </>
        }
      />
      {downloadError && (
        <p className="table__warn" role="alert">
          {downloadError}
        </p>
      )}

      <SegmentedControl label="Report" options={TABS} value={tab} onChange={onTabChange} />

      {communityId &&
        (tab === 'register' ? (
          <AttendanceRegister communityId={communityId} year={year} month={month} />
        ) : (
          <ReportSummary communityId={communityId} year={year} month={month} />
        ))}
    </div>
  );
}
