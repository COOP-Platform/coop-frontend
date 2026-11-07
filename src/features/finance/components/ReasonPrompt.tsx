import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import {
  Button,
  Dialog,
  IconChevronLeft,
  IconChevronRight,
  IconTile,
  Textarea,
} from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

interface ReasonPromptProps {
  open: boolean;
  title: string;
  subtitle: string;
  icon: ReactNode;
  /** One line naming the record: "Hall booking · 120,000 RWF". */
  about: string;
  placeholder: string;
  confirmLabel: string;
  busy: boolean;
  onClose: () => void;
  /** Rejects with the server's error, shown under the field. */
  onSubmit: (reason: string) => Promise<unknown>;
}

/** Reject or reverse something: always with a reason, which goes on the record. */
export function ReasonPrompt(props: ReasonPromptProps) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.title}
      subtitle={props.subtitle}
      icon={
        <IconTile tone="warning" round>
          {props.icon}
        </IconTile>
      }
    >
      {props.open && <ReasonForm {...props} />}
    </Dialog>
  );
}

function ReasonForm({
  about,
  placeholder,
  confirmLabel,
  busy,
  onClose,
  onSubmit,
}: ReasonPromptProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason.trim() === '') {
      setError('A reason is required. It is kept on the record.');
      return;
    }
    onSubmit(reason.trim()).catch((failure: unknown) =>
      setError(
        failure instanceof ApiError && failure.fieldErrors.reason
          ? failure.fieldErrors.reason
          : errorMessage(failure),
      ),
    );
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      <p className="table__muted">{about}</p>
      <Textarea
        label="Reason"
        placeholder={placeholder}
        maxLength={255}
        rows={3}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        error={error}
        required
      />
      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" disabled={busy}>
          {busy ? 'Saving…' : confirmLabel}
        </Button>
      </div>
    </form>
  );
}

/** Previous / Page n of m / Next, for server-paged lists. */
export function Pager({
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
