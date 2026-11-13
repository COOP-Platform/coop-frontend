import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import {
  Badge,
  EmptyState,
  IconBarChart,
  IconCalendar,
  IconChat,
  IconFile,
  IconMapPin,
  IconMegaphone,
  PageHeader,
  StatCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { formatLongDate, formatRelative } from '@/lib/format/date';

import { useAnnouncements, useUnreadAnnouncementsCount } from '../api/announcements';
import { formatEventWhen, myRsvpLabel, useEvents } from '../api/events';
import { MEETING_TYPE_LABELS, isUpcoming, useMeetings } from '../api/meetings';
import { useMinutesList } from '../api/minutes';
import { useMeetingReport } from '../api/reports';

const THIS_YEAR = new Date().getFullYear();

/**
 * The Meetings & Events dashboard: the next meeting, upcoming events with the
 * member's own answer, unread announcements, the latest minutes and this
 * year's attendance. Each panel links to the page that owns it; every member
 * sees it, and panels a member may not read are left out.
 */
export function AppDashboard() {
  const { communityId, membership, can } = useWorkspace();
  const meetings = useMeetings(can('meeting.view') ? communityId : undefined);
  const events = useEvents(can('event.view') ? communityId : undefined, 'upcoming');
  const unread = useUnreadAnnouncementsCount();
  const announcements = useAnnouncements(can('announcement.view') ? communityId : undefined, {
    status: 'published',
    page: 1,
    pageSize: 3,
  });
  const minutes = useMinutesList(can('meeting.view') ? communityId : undefined, 'final', 1);

  const upcoming = (meetings.data ?? [])
    .filter((m) => isUpcoming(m) && m.status !== 'cancelled')
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const next = upcoming[0];
  const eventItems = events.data?.items ?? [];
  const unreadCount = unread.data?.unread_count ?? 0;

  return (
    <div className="page">
      <PageHeader
        eyebrow={<span className="eyebrow eyebrow--muted">Meetings & Events</span>}
        title="Dashboard"
        subtitle={`What is coming up${membership ? ` in ${membership.community.name}` : ''}, and what you may have missed.`}
      />

      <div className="stat-grid stat-grid--four">
        <StatCard
          label="Next meeting"
          value={next ? formatRelative(next.scheduled_at) : 'None planned'}
          caption={next ? next.title : 'The Secretary schedules meetings'}
          icon={<IconChat />}
          tone="brand"
        />
        <StatCard
          label="Upcoming events"
          value={eventItems.length}
          caption={
            eventItems.some((e) => e.my_rsvp === null)
              ? `${eventItems.filter((e) => e.my_rsvp === null).length} waiting for your answer`
              : 'You have answered every invitation'
          }
          icon={<IconCalendar />}
          tone="info"
        />
        <StatCard
          label="Unread announcements"
          value={unreadCount}
          caption={unreadCount === 0 ? 'You are up to date' : 'Open Announcements to read them'}
          icon={<IconMegaphone />}
          tone={unreadCount > 0 ? 'warning' : 'info'}
          emphasis={unreadCount > 0}
        />
        {communityId && can('meeting.view') ? (
          <AttendanceCard communityId={communityId} />
        ) : (
          <StatCard label="Attendance" value="—" caption="" icon={<IconBarChart />} tone="info" />
        )}
      </div>

      <div className="meetings-dashboard">
        <Panel
          title="Next meeting"
          link={<Link to="/meetings/list">All meetings</Link>}
          empty={!next}
          emptyText="No meeting is planned yet."
        >
          {next && (
            <Link
              to="/meetings/$meetingId"
              params={{ meetingId: next.id }}
              className="meetings-dashboard__feature"
            >
              <span className="meetings-dashboard__title">{next.title}</span>
              <span className="table__muted">
                {MEETING_TYPE_LABELS[next.meeting_type]} · {formatLongDate(next.scheduled_at)} ·{' '}
                {new Date(next.scheduled_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {(next.location || next.online_link) && (
                <span className="table__muted">
                  <IconMapPin width={14} height={14} aria-hidden="true" />{' '}
                  {next.location ?? 'Online'}
                </span>
              )}
              <span className="table__muted">
                {next.agenda_count} agenda item{next.agenda_count === 1 ? '' : 's'}
              </span>
            </Link>
          )}
          {upcoming.length > 1 && (
            <p className="table__muted">
              Then:{' '}
              {upcoming
                .slice(1, 3)
                .map((m) => `${m.title} (${formatLongDate(m.scheduled_at)})`)
                .join(' · ')}
            </p>
          )}
        </Panel>

        <Panel
          title="Upcoming events"
          link={<Link to="/meetings/events">All events</Link>}
          empty={eventItems.length === 0}
          emptyText="No event is planned yet."
        >
          <ul className="meetings-dashboard__list" role="list">
            {eventItems.slice(0, 4).map((event) => (
              <li key={event.id}>
                <Link to="/meetings/events/$eventId" params={{ eventId: event.id }}>
                  {event.title}
                </Link>
                <span className="table__muted">{formatEventWhen(event)}</span>
                <Badge tone={event.my_rsvp === null ? 'warning' : 'neutral'}>
                  {myRsvpLabel(event)}
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Announcements"
          link={<Link to="/meetings/announcements">All announcements</Link>}
          empty={(announcements.data?.items.length ?? 0) === 0}
          emptyText="Nothing has been announced yet."
        >
          <ul className="meetings-dashboard__list" role="list">
            {(announcements.data?.items ?? []).map((a) => (
              <li key={a.id} className={a.is_read ? undefined : 'is-unread'}>
                <Link to="/meetings/announcements">{a.title}</Link>
                <span className="table__muted">
                  {a.published_at ? formatRelative(a.published_at) : ''}
                </span>
                {!a.is_read && <Badge tone="warning">New</Badge>}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Latest minutes"
          link={
            <Link to="/meetings/list" search={{ tab: 'minutes' }}>
              All minutes
            </Link>
          }
          empty={(minutes.data?.items.length ?? 0) === 0}
          emptyText="No minutes have been finalised yet."
        >
          <ul className="meetings-dashboard__list" role="list">
            {(minutes.data?.items ?? []).slice(0, 3).map((m) => (
              <li key={m.id}>
                <Link
                  to="/meetings/$meetingId"
                  params={{ meetingId: m.meeting.id }}
                  search={{ tab: 'minutes' }}
                >
                  <IconFile width={14} height={14} aria-hidden="true" /> {m.meeting.title}
                </Link>
                <span className="table__muted">
                  {formatLongDate(m.meeting.scheduled_at)} · {m.decisions_count} decision
                  {m.decisions_count === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function AttendanceCard({ communityId }: { communityId: string }) {
  const report = useMeetingReport(communityId, 'attendance', THIS_YEAR, null);
  const average = report.data?.summary.average_attendance;
  return (
    <StatCard
      label={`Attendance in ${THIS_YEAR}`}
      value={average === null || average === undefined ? '—' : `${Math.round(average)}%`}
      caption={
        report.data
          ? `Over ${report.data.summary.recorded} recorded meeting${report.data.summary.recorded === 1 ? '' : 's'}`
          : 'Loading…'
      }
      icon={<IconBarChart />}
      tone="brand"
    />
  );
}

function Panel({
  title,
  link,
  empty,
  emptyText,
  children,
}: {
  title: string;
  link: ReactNode;
  empty: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  return (
    <section className="card meetings-dashboard__panel" aria-label={title}>
      <header className="meetings-dashboard__head">
        <h2 className="section-head__title">{title}</h2>
        <span className="meetings-dashboard__link">{link}</span>
      </header>
      {empty ? <EmptyState icon={<IconCalendar />} title={emptyText} message="" /> : children}
    </section>
  );
}
