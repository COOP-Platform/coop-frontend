import { useState } from 'react';
import type { FormEvent } from 'react';

import {
  Button,
  Checkbox,
  Dialog,
  IconMegaphone,
  IconPencil,
  IconTile,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import { PRIORITY_LABEL, useCreateAnnouncement, useUpdateAnnouncement } from '../api/announcements';
import type { Announcement, AnnouncementFields, AnnouncementPriority } from '../api/announcements';

const PRIORITIES: AnnouncementPriority[] = ['normal', 'important', 'urgent'];

/** An ISO date-time as the `datetime-local` input wants it, in the user's time zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

interface Errors {
  title?: string;
  body?: string;
  priority?: string;
  expires_at?: string;
  form?: string;
}

/**
 * Write a new announcement, or edit one (`announcement` given). New ones are
 * saved as drafts unless the writer also holds announcement.publish and ticks
 * "Publish now". Drafts and published announcements can both be edited;
 * publishing has its own buttons.
 */
export function AnnouncementFormDialog({
  open,
  announcement,
  onClose,
  onSaved,
}: {
  open: boolean;
  announcement?: Announcement | null;
  onClose: () => void;
  onSaved: (saved: Announcement, message: string) => void;
}) {
  const editing = Boolean(announcement);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? 'Edit announcement' : 'New announcement'}
      subtitle={
        editing
          ? 'Changes show straight away for anyone who can see it.'
          : 'Share news with every member. It stays a draft until it is published.'
      }
      icon={
        <IconTile tone="brand" round>
          {editing ? <IconPencil /> : <IconMegaphone />}
        </IconTile>
      }
    >
      {open && (
        <AnnouncementForm announcement={announcement ?? null} onClose={onClose} onSaved={onSaved} />
      )}
    </Dialog>
  );
}

function AnnouncementForm({
  announcement,
  onClose,
  onSaved,
}: {
  announcement: Announcement | null;
  onClose: () => void;
  onSaved: (saved: Announcement, message: string) => void;
}) {
  const { communityId, can } = useWorkspace();
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();
  const canPublish = can('announcement.publish');

  const initialExpiry = toLocalInput(announcement?.expires_at ?? null);
  const [title, setTitle] = useState(announcement?.title ?? '');
  const [body, setBody] = useState(announcement?.body ?? '');
  const [priority, setPriority] = useState<AnnouncementPriority>(
    announcement?.priority ?? 'normal',
  );
  const [expiry, setExpiry] = useState(initialExpiry);
  const [publish, setPublish] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const busy = create.isPending || update.isPending;

  function showError(error: unknown) {
    const f = error instanceof ApiError ? error.fieldErrors : {};
    const mapped: Errors = {
      title: f.title,
      body: f.body,
      priority: f.priority,
      expires_at: f.expires_at,
    };
    const anyField = Object.values(mapped).some(Boolean);
    setErrors({ ...mapped, form: anyField ? undefined : errorMessage(error) });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: Errors = {};
    if (title.trim().length < 3) problems.title = 'Give it a title of at least 3 characters.';
    if (body.trim() === '') problems.body = 'Write the message members will read.';
    const expiryChanged = expiry !== initialExpiry;
    if (expiry !== '' && expiryChanged && new Date(expiry).getTime() <= Date.now())
      problems.expires_at = 'The expiry must be in the future.';
    setErrors(problems);
    if (Object.keys(problems).length > 0 || communityId === undefined) return;

    const expiresAt = expiry === '' ? null : new Date(expiry).toISOString();

    if (announcement === null) {
      create.mutate(
        {
          communityId,
          title: title.trim(),
          body: body.trim(),
          priority,
          expires_at: expiresAt,
          publish: canPublish && publish,
        },
        {
          onSuccess: (saved) =>
            onSaved(
              saved,
              saved.status === 'draft'
                ? `"${saved.title}" saved as a draft. Members cannot see it yet.`
                : `"${saved.title}" is published. Every member can read it now.`,
            ),
          onError: showError,
        },
      );
      return;
    }

    // Send only what changed: an unchanged expiry is left alone, so an
    // announcement whose expiry has passed can still be corrected.
    const changes: Partial<AnnouncementFields> = {};
    if (title.trim() !== announcement.title) changes.title = title.trim();
    if (body.trim() !== announcement.body) changes.body = body.trim();
    if (priority !== announcement.priority) changes.priority = priority;
    if (expiryChanged) changes.expires_at = expiresAt;
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    update.mutate(
      { communityId, announcementId: announcement.id, changes },
      {
        onSuccess: (saved) => onSaved(saved, `"${saved.title}" updated.`),
        onError: showError,
      },
    );
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      <Input
        label="Title"
        placeholder="e.g. November contributions are due on the 25th"
        maxLength={160}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={errors.title}
        required
      />
      <Textarea
        label="Message"
        placeholder="What do members need to know?"
        rows={6}
        maxLength={10000}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        error={errors.body}
        required
      />
      <div className="form-row">
        <Select
          label="Priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value as AnnouncementPriority)}
          options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
          error={errors.priority}
        />
        <Input
          label="Hide it after"
          optional
          type="datetime-local"
          value={expiry}
          onChange={(event) => setExpiry(event.target.value)}
          hint="Leave empty to keep it showing."
          error={errors.expires_at}
        />
      </div>
      {announcement === null && canPublish && (
        <Checkbox
          label="Publish now, so every member sees it straight away"
          checked={publish}
          onChange={(event) => setPublish(event.target.checked)}
        />
      )}

      {errors.form && <p className="form-error">{errors.form}</p>}

      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          icon={announcement ? <IconPencil /> : <IconMegaphone />}
          disabled={busy}
        >
          {busy
            ? 'Saving…'
            : announcement
              ? 'Save changes'
              : publish && canPublish
                ? 'Publish'
                : 'Save draft'}
        </Button>
      </div>
    </form>
  );
}
