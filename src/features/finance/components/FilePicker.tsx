import type { DragEvent } from 'react';
import { useId, useRef, useState } from 'react';

import { Button, IconFile, IconTrash } from '@/components/ui';

/** What the backend accepts for proofs and receipts (it re-checks the bytes). */
const FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const FILE_MAX_BYTES = 5 * 1024 * 1024;

/** Click-or-drop picker for a proof or receipt: a screenshot, photo or PDF (5 MB). */
export function FilePicker({
  label,
  prompt,
  value,
  onChange,
  error,
}: {
  label: string;
  /** After "Click to upload". */
  prompt: string;
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const message = localError ?? error;

  function accept(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = '';
    if (file === undefined) return;
    if (!FILE_TYPES.includes(file.type)) {
      setLocalError('Attach a JPG, PNG or PDF file.');
      return;
    }
    if (file.size > FILE_MAX_BYTES) {
      setLocalError('The file is larger than 5 MB. Attach a smaller one.');
      return;
    }
    setLocalError(undefined);
    onChange(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files[0]);
  }

  return (
    <div className="image-drop">
      <div className="field__label-row">
        <label htmlFor={inputId} className="field__label">
          {label} <span className="field__optional">(Optional)</span>
        </label>
        <span className="image-drop__ratio">JPG, PNG or PDF · 5 MB</span>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={FILE_TYPES.join(',')}
        className="visually-hidden"
        onChange={(event) => accept(event.target.files?.[0])}
      />

      {value ? (
        <div className="proof-file">
          <IconFile width={20} height={20} aria-hidden="true" />
          <span className="proof-file__name">{value.name}</span>
          <span className="table__muted">{Math.max(1, Math.round(value.size / 1024))} KB</span>
          <Button
            variant="secondary"
            size="sm"
            inline
            icon={<IconTrash />}
            onClick={() => onChange(null)}
          >
            Remove
          </Button>
        </div>
      ) : (
        <div
          className={[
            'image-drop__zone',
            'image-drop__zone--wide',
            dragging ? 'image-drop__zone--dragging' : null,
            message ? 'image-drop__zone--invalid' : null,
          ]
            .filter(Boolean)
            .join(' ')}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          aria-hidden="true"
        >
          <span className="image-drop__icon">
            <IconFile />
          </span>
          <p className="image-drop__prompt">
            <strong>Click to upload</strong> {prompt}
          </p>
          <span className="btn btn--secondary btn--sm btn--inline">Browse files</span>
        </div>
      )}

      {message && (
        <p className="field__error" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
