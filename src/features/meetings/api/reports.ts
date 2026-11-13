import { useQueries, useQuery } from '@tanstack/react-query';

import { apiDownload, apiFetch } from '@/lib/api/client';

/*
 * Meetings & Events reports (backend S3-14, meetings/reports.py). One report
 * per call for a calendar year, or one month of it, on the meeting date.
 * Every member may read them (meeting.view). Attendance values keep the
 * backend's words: present | apology | absent (the Brief's "excused" is
 * `apology`; there is no "late").
 */

export type MeetingReportType = 'meetings' | 'attendance';
export type MeetingType = 'general' | 'committee' | 'emergency' | 'agm';
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type AttendanceMark = 'present' | 'apology' | 'absent';

/** The backend accepts years 2020-2100. */
export const MIN_REPORT_YEAR = 2020;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** "2026" or "March 2026". */
export function periodLabel(year: number, month: number | null): string {
  return month === null ? String(year) : `${MONTH_NAMES[month - 1]} ${year}`;
}

export const MEETING_TYPE_LABEL: Record<MeetingType, string> = {
  general: 'General',
  committee: 'Committee',
  emergency: 'Emergency',
  agm: 'Annual general meeting',
};

export interface ReportPeriod {
  year: number;
  /** 1-12, or null for the whole year. */
  month: number | null;
  /** ISO dates: first and last day of the period. */
  from: string;
  to: string;
}

export interface ReportMeetingRef {
  id: string;
  title: string;
  meeting_type: MeetingType;
  scheduled_at: string;
}

export interface ReportMember {
  membership_id: string;
  full_name: string;
}

export interface MeetingsReport {
  type: 'meetings';
  period: ReportPeriod;
  summary: {
    total: number;
    /** Scheduled or in progress. */
    upcoming: number;
    completed: number;
    cancelled: number;
    by_type: Record<MeetingType, number>;
  };
  rows: (ReportMeetingRef & {
    status: MeetingStatus;
    duration_minutes: number | null;
    location: string | null;
    online_link: string | null;
    agenda_count: number;
    attendance_locked: boolean;
    minutes_status: 'draft' | 'final' | null;
    cancel_reason: string | null;
  })[];
}

export interface AttendanceReportRow {
  meeting: ReportMeetingRef;
  status: MeetingStatus;
  /** Locked roll-calls are final; an open one may still change. */
  locked: boolean;
  expected: number;
  present: number;
  apology: number;
  absent: number;
  unrecorded: number;
  /** present / expected, 1 decimal. */
  percent: number;
  threshold: number;
  quorum_reached: boolean;
}

export interface MemberAttendance {
  member: ReportMember;
  /** Locked roll-calls the member was on. */
  meetings: number;
  present: number;
  apology: number;
  absent: number;
  percent: number;
}

export interface AttendanceReport {
  type: 'attendance';
  period: ReportPeriod;
  summary: {
    /** Meetings of the period that have started and were not cancelled. */
    meetings: number;
    /** Of those, how many have a locked roll-call. */
    recorded: number;
    /** Mean percent over the locked roll-calls; null when there are none. */
    average_attendance: number | null;
    quorum_met: number;
  };
  rows: AttendanceReportRow[];
  /** Per member, over the locked roll-calls of the period. */
  members: MemberAttendance[];
}

interface ReportByType {
  meetings: MeetingsReport;
  attendance: AttendanceReport;
}

/** The part of a meeting's roll-call the register grid needs. */
export interface RollCall {
  meeting_id: string;
  locked: boolean;
  records: { member: ReportMember; status: AttendanceMark | null }[];
}

function periodQuery(year: number, month: number | null): string {
  return `year=${year}${month === null ? '' : `&month=${month}`}`;
}

export function useMeetingReport<T extends MeetingReportType>(
  communityId: string,
  type: T,
  year: number,
  month: number | null,
) {
  return useQuery({
    queryKey: ['meetings', communityId, 'reports', type, year, month],
    queryFn: () =>
      apiFetch<ReportByType[T]>(
        `/communities/${communityId}/meetings/reports/?type=${type}&${periodQuery(year, month)}`,
      ),
  });
}

/*
 * The JSON report gives each member's totals but not their mark at each
 * meeting -- only the register PDF prints that grid. So the screen reads the
 * roll-call of every locked meeting of the period (the same ones the PDF
 * prints), one request each.
 */
export function useRollCalls(communityId: string, meetingIds: string[]) {
  return useQueries({
    queries: meetingIds.map((meetingId) => ({
      queryKey: ['meetings', communityId, 'reports', 'roll-call', meetingId],
      queryFn: () =>
        apiFetch<RollCall>(`/communities/${communityId}/meetings/${meetingId}/attendance/`),
    })),
  });
}

/** The attendance register as a PDF (P present, A apology, X absent). */
export function downloadAttendanceRegister(
  communityId: string,
  year: number,
  month: number | null,
): Promise<void> {
  const suffix = month === null ? `${year}` : `${year}-${String(month).padStart(2, '0')}`;
  return apiDownload(
    `/communities/${communityId}/meetings/reports/register/?${periodQuery(year, month)}`,
    `attendance-register-${suffix}.pdf`,
  );
}
