import type { ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import { IconChevronDown } from './icons';

interface DropdownProps {
  /** Content of the trigger button, before the chevron. */
  trigger: ReactNode;
  /** Accessible name of the trigger when its visible content is not enough. */
  label?: string;
  triggerClassName?: string;
  align?: 'start' | 'end';
  /** Show the trailing chevron. Off for icon-only triggers like the bell. */
  chevron?: boolean;
  /** Receives `close` so an item can dismiss the menu after acting. */
  children: (close: () => void) => ReactNode;
}

/**
 * Disclosure-style popover: a button that shows a panel of links or buttons.
 * Closes on outside click, on Escape (returning focus to the trigger), and
 * whenever an item calls `close`.
 */
export function Dropdown({
  trigger,
  label,
  triggerClassName,
  align = 'start',
  chevron = true,
  children,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="dropdown" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={['dropdown__trigger', triggerClassName].filter(Boolean).join(' ')}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
        {chevron && (
          <span className="dropdown__chevron" aria-hidden="true">
            <IconChevronDown width={14} height={14} />
          </span>
        )}
      </button>
      {open && (
        <div id={panelId} className={`dropdown__panel dropdown__panel--${align}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
