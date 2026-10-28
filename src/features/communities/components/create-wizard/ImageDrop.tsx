import { useId, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';

import { Button, IconTrash } from '@/components/ui';

import { ACCEPTED_TYPES, ImageRejectedError, prepareImage } from './images';
import type { ImageSpec } from './images';

interface ImageDropProps {
  label: string;
  /** Right of the label — "1:1 Ratio". */
  ratio: string;
  icon: ReactNode;
  prompt: string;
  hint: string;
  browseLabel: string;
  spec: ImageSpec;
  shape: 'square' | 'wide';
  value: string;
  onChange: (dataUrl: string) => void;
  /** From the server, when it refused the value. */
  error?: string;
}

/**
 * Click-or-drop image picker with a preview. The file input stays in the
 * accessibility tree (visually hidden, labelled) so keyboard and screen
 * reader users pick a file exactly as they would anywhere else; the drop zone
 * is the pointer-only convenience on top.
 */
export function ImageDrop({
  label,
  ratio,
  icon,
  prompt,
  hint,
  browseLabel,
  spec,
  shape,
  value,
  onChange,
  error,
}: ImageDropProps) {
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const message = localError ?? error;

  async function accept(file: File | undefined) {
    if (file === undefined) {
      return;
    }
    setBusy(true);
    setLocalError(undefined);
    try {
      onChange(await prepareImage(file, spec));
    } catch (caught) {
      setLocalError(
        caught instanceof ImageRejectedError ? caught.message : 'That image could not be used.',
      );
    } finally {
      setBusy(false);
      // Picking the same file again after removing it must still fire `change`.
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void accept(event.dataTransfer.files[0]);
  }

  const zoneClasses = [
    'image-drop__zone',
    `image-drop__zone--${shape}`,
    dragging ? 'image-drop__zone--dragging' : null,
    message ? 'image-drop__zone--invalid' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="image-drop">
      <div className="field__label-row">
        <label htmlFor={inputId} className="field__label">
          {label}
        </label>
        <span className="image-drop__ratio">{ratio}</span>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="visually-hidden"
        aria-describedby={message ? messageId : undefined}
        onChange={(event) => void accept(event.target.files?.[0])}
      />

      {value ? (
        <div className={`image-drop__preview image-drop__preview--${shape}`}>
          <img src={value} alt={`${label} preview`} />
          <div className="image-drop__actions">
            <Button
              variant="secondary"
              size="sm"
              inline
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              Replace
            </Button>
            <Button
              variant="secondary"
              size="sm"
              inline
              icon={<IconTrash />}
              onClick={() => onChange('')}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={zoneClasses}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          aria-hidden="true"
        >
          <span className="image-drop__icon">{icon}</span>
          <p className="image-drop__prompt">
            {busy ? (
              'Preparing image…'
            ) : (
              <>
                <strong>Click to upload</strong> {prompt}
              </>
            )}
          </p>
          <p className="image-drop__hint">{hint}</p>
          <span className="btn btn--secondary btn--sm btn--inline">{browseLabel}</span>
        </div>
      )}

      {message && (
        <p id={messageId} className="field__error" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
