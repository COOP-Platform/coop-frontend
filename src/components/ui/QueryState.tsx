import { EmptyState } from './EmptyState';
import { IconAlertTriangle, IconClock } from './icons';
import { IconTile } from './IconTile';

/** Placeholder while a screen's first request is in flight. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <EmptyState
        icon={
          <IconTile tone="neutral" size="lg">
            <IconClock />
          </IconTile>
        }
        title={label}
      />
    </div>
  );
}

/** A failed request, with the message already made human (see lib/api/errors). */
export function ErrorState({
  title = 'Could not load this',
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div role="alert">
      <EmptyState
        icon={
          <IconTile tone="danger" size="lg">
            <IconAlertTriangle />
          </IconTile>
        }
        title={title}
        message={message}
      />
    </div>
  );
}
