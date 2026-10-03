import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

import { IconClose } from './icons';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the panel. */
  label: string;
  children: ReactNode;
}

/**
 * Panel that slides in from the right, over the page. Built on the native
 * `<dialog>` like `Dialog`, so focus trapping, Escape and the inert
 * background come from the browser. A click on the backdrop closes it.
 */
export function Drawer({ open, onClose, label, children }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const drawer = ref.current;
    if (!drawer) return;
    if (open && !drawer.open) drawer.showModal();
    if (!open && drawer.open) drawer.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-label={label}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && (
        <div className="drawer__panel">
          <button type="button" className="drawer__close" aria-label="Close" onClick={onClose}>
            <IconClose />
          </button>
          {children}
        </div>
      )}
    </dialog>
  );
}
