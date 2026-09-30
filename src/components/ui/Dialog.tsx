import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';

import { IconClose } from './icons';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Small line under the title. */
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  /** Buttons row at the bottom. */
  footer?: ReactNode;
}

/**
 * Modal built on the native `<dialog>`: the browser handles focus trapping,
 * Escape and the inert background, so none of that is reimplemented here.
 */
export function Dialog({ open, onClose, title, subtitle, icon, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && (
        <div className="dialog__panel">
          <header className="dialog__header">
            {icon}
            <div className="dialog__heading">
              <h2 id={titleId} className="dialog__title">
                {title}
              </h2>
              {subtitle && <p className="dialog__subtitle">{subtitle}</p>}
            </div>
            <button type="button" className="dialog__close" aria-label="Close" onClick={onClose}>
              <IconClose />
            </button>
          </header>
          <div className="dialog__body">{children}</div>
          {footer && <footer className="dialog__footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
