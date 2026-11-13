/**
 * CONTRACT (owned by the Minutes work): the "Minutes" tab of one meeting's
 * page (/meetings/$meetingId?tab=minutes): read, write, edit, finalise and
 * download the minutes of that meeting. Replace this stub; keep the name and
 * props.
 */
export function MeetingMinutesTab({ meetingId }: { meetingId: string }) {
  return <p className="table__muted">Minutes for meeting {meetingId} are on the way.</p>;
}
