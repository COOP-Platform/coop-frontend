import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import {
  Badge,
  Button,
  Dialog,
  Drawer,
  EmptyState,
  ErrorState,
  IconCheckCircle,
  IconChevronLeft,
  IconChevronRight,
  IconEyeOff,
  IconMegaphone,
  IconPencil,
  IconPlus,
  IconSend,
  IconTile,
  IconTrash,
  LoadingState,
  PageHeader,
  SegmentedControl,
} from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { formatDate, formatLongDate, formatRelative } from '@/lib/format/date';

import {
  MANAGE_ANNOUNCEMENTS,
  PRIORITY_LABEL,
  useAnnouncements,
  useDeleteAnnouncement,
  useMarkAnnouncementRead,
  usePublishAnnouncement,
  useUnpublishAnnouncement,
  useUnreadAnnouncementsCount,
} from '../api/announcements';
import type { Announcement, AnnouncementPriority, AnnouncementStatus } from '../api/announcements';
import { AnnouncementFormDialog } from './AnnouncementFormDialog';

export type AnnouncementsTab = 'feed' | 'drafts' | 'expired';

const PAGE_SIZE = 20;

const PRIORITY_TONE: Record<AnnouncementPriority, BadgeTone> = {
  normal: 'neutral',
  important: 'warning',
  urgent: 'danger',
};

const STATUS_BADGE: Record<AnnouncementStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  published: { label: 'Published', tone: 'success' },
  expired: { label: 'Expired', tone: 'info' },
};

const TAB_STATUS = { feed: 'published', drafts: 'draft', expired: 'expired' } as const;

/**
 * Community announcements (backend S3-13). Every member reads the feed:
 * published and not expired, newest first, unread ones highlighted; opening
 * one marks it read. Writers get "New announcement" and a Drafts tab (the
 * committee sees every draft, a writer who can only create sees their own);
 * the committee also gets an Expired tab.
 */
export function AnnouncementsPage({
  tab,
  onTabChange,
}: {
  tab: AnnouncementsTab;
  onTabChange: (tab: AnnouncementsTab) => void;
}) {
  const { communityId, can } = useWorkspace();
  const canCreate = can('announcement.create');
  const canManage = MANAGE_ANNOUNCEMENTS.some((code) => can(code));
  const canSeeDrafts = canCreate || canManage;

  const tabs: { value: AnnouncementsTab; label: string }[] = [
    { value: 'feed', label: 'Announcements' },
    ...(canSeeDrafts ? [{ value: 'drafts' as const, label: 'Drafts' }] : []),
    ...(canManage ? [{ value: 'expired' as const, label: 'Expired' }] : []),
  ];
  // A link to a tab the member cannot open falls back to the feed.
  const current = tabs.some((t) => t.value === tab) ? tab : 'feed';

  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [writing, setWriting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const list = useAnnouncements(communityId, {
    status: TAB_STATUS[current],
    page,
    pageSize: PAGE_SIZE,
  });
  const unread = useUnreadAnnouncementsCount();
  const unreadCount = unread.data?.unread_count ?? 0;

  return (
    <div className="page">
      <PageHeader
        title="Announcements"
        subtitle="News and reminders for everyone in the community."
        badge={
          unreadCount > 0 ? (
            <Badge tone="brand" dot>
              {unreadCount} unread
            </Badge>
          ) : undefined
        }
        actions={
          canCreate && (
            <Button inline icon={<IconPlus />} onClick={() => setWriting(true)}>
              New announcement
            </Button>
          )
        }
      />

      {notice && (
        <div className="notice notice--success" role="status">
          <IconCheckCircle width={20} height={20} aria-hidden="true" />
          <div>
            <p className="notice__title">Done</p>
            <p className="notice__text">{notice}</p>
          </div>
        </div>
      )}

      {tabs.length > 1 && (
        <SegmentedControl
          label="Which announcements"
          options={tabs}
          value={current}
          onChange={(next) => {
            setPage(1);
            onTabChange(next);
          }}
        />
      )}

      {list.data === undefined ? (
        list.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState message={errorMessage(list.error)} />
        )
      ) : list.data.items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconMegaphone width={28} height={28} />}
            title={EMPTY[current].title}
            message={EMPTY[current].message}
          />
        </div>
      ) : (
        <>
          <ul className="announcement-list" aria-label="Announcements">
            {list.data.items.map((item) => (
              <li key={item.id}>
                <AnnouncementCard
                  announcement={item}
                  showUnread={current === 'feed'}
                  onOpen={() => setSelected(item)}
                />
              </li>
            ))}
          </ul>
          <Pager
            page={page}
            pageCount={Math.max(1, Math.ceil(list.data.total / PAGE_SIZE))}
            onChange={setPage}
          />
        </>
      )}

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        label={selected ? `Announcement: ${selected.title}` : 'Announcement'}
      >
        {selected && (
          <AnnouncementDetails
            announcement={selected}
            onChanged={setSelected}
            onDone={(message) => {
              setNotice(message);
              setSelected(null);
            }}
          />
        )}
      </Drawer>

      <AnnouncementFormDialog
        open={writing}
        onClose={() => setWriting(false)}
        onSaved={(saved, message) => {
          setWriting(false);
          setNotice(message);
          setPage(1);
          if (saved.status === 'draft' && canSeeDrafts) onTabChange('drafts');
          else if (saved.status === 'published') onTabChange('feed');
        }}
      />
    </div>
  );
}

const EMPTY: Record<AnnouncementsTab, { title: string; message: string }> = {
  feed: {
    title: 'No announcements right now',
    message: 'News and reminders from the committee will show here.',
  },
  drafts: {
    title: 'No drafts',
    message: 'Announcements saved but not yet published show here.',
  },
  expired: {
    title: 'Nothing expired',
    message: 'Announcements whose "hide after" time has passed show here.',
  },
};

function AnnouncementCard({
  announcement: a,
  showUnread,
  onOpen,
}: {
  announcement: Announcement;
  showUnread: boolean;
  onOpen: () => void;
}) {
  const unread = showUnread && !a.is_read;
  const when = a.published_at ?? a.created_at;
  return (
    <button
      type="button"
      className={`card announcement-card${unread ? ' announcement-card--unread' : ''}`}
      aria-haspopup="dialog"
      onClick={onOpen}
    >
      <span className="announcement-card__head">
        {unread && <span className="announcement-card__dot" aria-label="Unread" />}
        <span className="announcement-card__title">{a.title}</span>
        <span className="announcement-card__badges">
          {a.priority !== 'normal' && (
            <Badge tone={PRIORITY_TONE[a.priority]}>{PRIORITY_LABEL[a.priority]}</Badge>
          )}
          {a.status !== 'published' && (
            <Badge tone={STATUS_BADGE[a.status].tone}>{STATUS_BADGE[a.status].label}</Badge>
          )}
        </span>
      </span>
      <span className="announcement-card__excerpt">{a.body}</span>
      <span className="table__muted">
        {a.created_by.full_name} · {a.published_at ? '' : 'written '}
        <time dateTime={when} title={formatLongDate(when)}>
          {formatRelative(when)}
        </time>
      </span>
    </button>
  );
}

function AnnouncementDetails({
  announcement: a,
  onChanged,
  onDone,
}: {
  announcement: Announcement;
  onChanged: (a: Announcement) => void;
  onDone: (message: string) => void;
}) {
  const { communityId, can } = useWorkspace();
  const markRead = useMarkAnnouncementRead();
  const publish = usePublishAnnouncement();
  const unpublish = useUnpublishAnnouncement();
  const remove = useDeleteAnnouncement();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<'unpublish' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Opening an unread announcement in the feed marks it read, once.
  const marked = useRef(false);
  const { mutate: markReadMutate } = markRead;
  useEffect(() => {
    if (marked.current || communityId === undefined) return;
    if (a.status !== 'published' || a.is_read) return;
    marked.current = true;
    markReadMutate({ communityId, announcementId: a.id });
  }, [a.id, a.is_read, a.status, communityId, markReadMutate]);

  const status = STATUS_BADGE[a.status];
  const target = communityId ? { communityId, announcementId: a.id } : null;
  const canEdit = can('announcement.update');
  const canPublish = can('announcement.publish');
  const canDelete = can('announcement.delete');

  return (
    <section className="details" aria-labelledby="announcement-details-title">
      <header className="details__head">
        <div>
          <p className="section-head__eyebrow">Announcement · {PRIORITY_LABEL[a.priority]}</p>
          <h2 id="announcement-details-title" className="section-head__title">
            {a.title}
          </h2>
          <p className="section-head__subtitle">
            {a.published_at
              ? `Published ${formatLongDate(a.published_at)}`
              : 'Draft: members cannot see it yet'}
          </p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </header>

      <p className="announcement-body">{a.body}</p>

      <dl className="details__list">
        <div>
          <dt>Written by</dt>
          <dd>
            {a.created_by.full_name} · {formatDate(a.created_at)}
          </dd>
        </div>
        <div>
          <dt>Priority</dt>
          <dd>{PRIORITY_LABEL[a.priority]}</dd>
        </div>
        <div>
          <dt>{a.status === 'expired' ? 'Hidden since' : 'Hidden after'}</dt>
          <dd>{a.expires_at ? formatLongDate(a.expires_at) : 'Never'}</dd>
        </div>
        {a.updated_at !== a.created_at && (
          <div>
            <dt>Last changed</dt>
            <dd>{formatDate(a.updated_at)}</dd>
          </div>
        )}
      </dl>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {target && (canEdit || canPublish || canDelete) && (
        <div className="review-actions">
          {canEdit && (
            <Button
              variant="secondary"
              size="sm"
              inline
              icon={<IconPencil />}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          )}
          {canPublish && a.status === 'draft' && (
            <Button
              size="sm"
              inline
              icon={<IconSend />}
              disabled={publish.isPending}
              onClick={() => {
                setError(null);
                publish.mutate(target, {
                  onSuccess: (saved) =>
                    onDone(`"${saved.title}" is published. Every member can read it now.`),
                  onError: (failure) => setError(errorMessage(failure)),
                });
              }}
            >
              {publish.isPending ? 'Publishing…' : 'Publish'}
            </Button>
          )}
          {canPublish && a.status !== 'draft' && (
            <Button
              variant="secondary"
              size="sm"
              inline
              icon={<IconEyeOff />}
              onClick={() => setConfirm('unpublish')}
            >
              Unpublish
            </Button>
          )}
          {canDelete && (
            <Button
              variant="secondary"
              size="sm"
              inline
              icon={<IconTrash />}
              onClick={() => setConfirm('delete')}
            >
              Delete
            </Button>
          )}
        </div>
      )}

      <AnnouncementFormDialog
        open={editing}
        announcement={a}
        onClose={() => setEditing(false)}
        onSaved={(saved) => {
          setEditing(false);
          setError(null);
          onChanged(saved);
        }}
      />

      {target && (
        <>
          <ConfirmDialog
            open={confirm === 'unpublish'}
            title="Unpublish this announcement?"
            subtitle="It leaves the members' list and goes back to the drafts. You can publish it again later."
            icon={<IconEyeOff />}
            about={a.title}
            confirmLabel="Unpublish"
            busy={unpublish.isPending}
            onClose={() => setConfirm(null)}
            onConfirm={() =>
              unpublish.mutateAsync(target).then((saved) => {
                setConfirm(null);
                onDone(`"${saved.title}" is back in the drafts. Members no longer see it.`);
              })
            }
          />
          <ConfirmDialog
            open={confirm === 'delete'}
            title="Delete this announcement?"
            subtitle="It disappears for everyone. This cannot be undone here."
            icon={<IconTrash />}
            about={a.title}
            confirmLabel="Delete"
            busy={remove.isPending}
            onClose={() => setConfirm(null)}
            onConfirm={() =>
              remove.mutateAsync(target).then(() => {
                setConfirm(null);
                onDone(`"${a.title}" deleted.`);
              })
            }
          />
        </>
      )}
    </section>
  );
}

function ConfirmDialog({
  open,
  title,
  subtitle,
  icon,
  about,
  confirmLabel,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  icon: ReactNode;
  about: string;
  confirmLabel: string;
  busy: boolean;
  onClose: () => void;
  /** Rejects with the server's error, shown in the dialog. */
  onConfirm: () => Promise<unknown>;
}) {
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setError(null);
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title={title}
      subtitle={subtitle}
      icon={
        <IconTile tone="warning" round>
          {icon}
        </IconTile>
      }
    >
      <div className="dialog__form">
        <p className="table__muted">{about}</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog__footer dialog__footer--flush">
          <Button variant="tint" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => {
              setError(null);
              onConfirm().catch((failure: unknown) => setError(errorMessage(failure)));
            }}
          >
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/** Previous / Page n of m / Next. */
function Pager({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination__step"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <IconChevronLeft width={16} height={16} />
        Previous
      </button>
      <span className="table__muted">
        Page {page} of {pageCount}
      </span>
      <button
        type="button"
        className="pagination__step"
        disabled={page === pageCount}
        onClick={() => onChange(page + 1)}
      >
        Next
        <IconChevronRight width={16} height={16} />
      </button>
    </nav>
  );
}
