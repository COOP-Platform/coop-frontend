import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { Button, IconRefresh, IconUploadCloud } from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query-keys';

import { UploadTimeoutError, uploadCommunityImageWithProgress } from '../../api/communities';
import type { CommunityImageKind } from '../../api/communities';
import {
  ACCEPTED_TYPES,
  ImageRejectedError,
  dataUrlToBlob,
  prepareImage,
} from '../create-wizard/images';
import type { ImageSpec } from '../create-wizard/images';

/*
 * The endpoint takes JPEG/PNG/WebP up to 5 MB. The picked image is scaled to
 * the size it is shown at before it leaves the browser (create-wizard/images),
 * so what actually uploads is a few hundred KB even from a phone camera.
 */
const SPECS: Record<CommunityImageKind, ImageSpec> = {
  logo: { maxBytes: 5 * 1024 * 1024, maxWidth: 400, maxHeight: 400 },
  cover: { maxBytes: 5 * 1024 * 1024, maxWidth: 1200, maxHeight: 675 },
};

const LABEL: Record<CommunityImageKind, string> = { logo: 'Logo', cover: 'Cover banner' };

type Phase = 'idle' | 'preparing' | 'uploading' | 'failed' | 'done';

function uploadErrorMessage(error: unknown): string {
  if (error instanceof UploadTimeoutError) return error.message;
  if (error instanceof ImageRejectedError) return error.message;
  if (error instanceof TypeError) {
    return 'The connection dropped before the upload finished. Check your connection and try again.';
  }
  if (error instanceof ApiError) {
    // 404/405: a server without the upload endpoints; 503: no storage behind them.
    if (error.status === 404 || error.status === 405 || error.status === 503) {
      return 'Image uploads are not available on this server yet.';
    }
    if (error.fieldErrors.file) return error.fieldErrors.file;
  }
  return errorMessage(error);
}

interface ImageUploadProps {
  communityId: string;
  kind: CommunityImageKind;
  /** What is stored now. */
  currentUrl: string | null;
  /** The placeholder or current image, rendered by the caller. */
  children: ReactNode;
}

/**
 * Pick, preview and upload the logo or cover. Shows real upload progress,
 * gives up after a minute on a stalled connection, and keeps the prepared
 * file so a failed upload can be retried without picking it again.
 */
export function ImageUpload({ communityId, kind, currentUrl, children }: ImageUploadProps) {
  const queryClient = useQueryClient();
  const inputId = useId();
  const statusId = `${inputId}-status`;
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Leaving the page mid-upload stops it rather than finishing in the background.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function upload(file: Blob) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('uploading');
    setProgress(0);
    setError(null);
    try {
      const community = await uploadCommunityImageWithProgress(communityId, kind, file, {
        onProgress: setProgress,
        signal: controller.signal,
      });
      queryClient.setQueryData(queryKeys.communities.detail(communityId), community);
      void queryClient.invalidateQueries({ queryKey: queryKeys.communities.list() });
      setPhase('done');
      setPreview(null);
      setBlob(null);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        // Cancelled: back to what is stored.
        setPhase('idle');
        setPreview(null);
        setBlob(null);
        return;
      }
      setPhase('failed');
      setError(uploadErrorMessage(caught));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  async function pick(file: File | undefined) {
    if (file === undefined) return;
    setPhase('preparing');
    setError(null);
    try {
      const dataUrl = await prepareImage(file, SPECS[kind]);
      const prepared = await dataUrlToBlob(dataUrl);
      setPreview(dataUrl);
      setBlob(prepared);
      await upload(prepared);
    } catch (caught) {
      setPhase('failed');
      setError(uploadErrorMessage(caught));
    } finally {
      // Picking the same file again must still fire `change`.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const label = LABEL[kind];
  const busy = phase === 'preparing' || phase === 'uploading';
  const percent = Math.round(progress * 100);

  return (
    <div className={`cs-upload cs-upload--${kind}`}>
      <div className="cs-upload__media">
        {preview ? (
          <img
            className={kind === 'logo' ? 'cs-logo cs-logo--lg' : 'cs-cover'}
            src={preview}
            alt={`New ${label.toLowerCase()} preview`}
          />
        ) : (
          children
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="visually-hidden"
        aria-describedby={statusId}
        disabled={busy}
        onChange={(event) => void pick(event.target.files?.[0])}
      />

      <div className="cs-upload__controls">
        <label htmlFor={inputId} className="cs-upload__label">
          {label}
        </label>
        <p id={statusId} className="cs-upload__hint" aria-live="polite">
          {phase === 'preparing' && 'Preparing the image…'}
          {phase === 'uploading' && (percent >= 100 ? 'Saving…' : `Uploading… ${percent}%`)}
          {phase === 'done' && `${label} saved.`}
          {(phase === 'idle' || phase === 'failed') && 'PNG, JPG or WebP, up to 5 MB.'}
        </p>

        {phase === 'uploading' && (
          <div
            className="cs-progress"
            role="progressbar"
            aria-label={`${label} upload`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <span className="cs-progress__bar" style={{ width: `${percent}%` }} />
          </div>
        )}

        {phase === 'failed' && error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}

        <div className="cs-upload__actions">
          {phase === 'uploading' ? (
            <Button variant="secondary" size="sm" inline onClick={() => abortRef.current?.abort()}>
              Cancel
            </Button>
          ) : (
            <>
              {phase === 'failed' && blob !== null && (
                <Button
                  variant="primary"
                  size="sm"
                  inline
                  icon={<IconRefresh />}
                  onClick={() => void upload(blob)}
                >
                  Retry
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                inline
                icon={<IconUploadCloud />}
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                {phase === 'failed'
                  ? 'Choose another'
                  : currentUrl
                    ? `Replace ${label.toLowerCase()}`
                    : `Upload ${label.toLowerCase()}`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
