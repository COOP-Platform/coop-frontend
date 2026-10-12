/*
 * Preparing a picked logo or cover for upload.
 *
 * The image is scaled down to the size it is displayed at and re-encoded
 * before it leaves the browser, so a 5 MB phone photo uploads as a few
 * hundred KB. Until the community exists (the upload endpoints need its id)
 * it is held as a data URL: that is what the preview shows and what the
 * local draft can store, and `dataUrlToBlob` turns it back into a file at
 * submit time.
 *
 * SVG is not accepted: the upload endpoint refuses it, because an SVG served
 * from a public bucket is a document that can run script.
 */

export interface ImageSpec {
  maxBytes: number;
  maxWidth: number;
  maxHeight: number;
}

export const LOGO_SPEC: ImageSpec = { maxBytes: 2 * 1024 * 1024, maxWidth: 400, maxHeight: 400 };
export const COVER_SPEC: ImageSpec = {
  maxBytes: 5 * 1024 * 1024,
  maxWidth: 1200,
  maxHeight: 675,
};

export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export class ImageRejectedError extends Error {}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new ImageRejectedError('That file could not be read.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new ImageRejectedError('That file is not an image we can open.'));
    image.src = src;
  });
}

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export async function prepareImage(file: File, spec: ImageSpec): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new ImageRejectedError('Use a PNG, JPG or WebP image.');
  }
  if (file.size > spec.maxBytes) {
    throw new ImageRejectedError(
      `That image is over ${formatMb(spec.maxBytes)}. Pick a smaller one.`,
    );
  }

  const source = await readAsDataUrl(file);
  const image = await loadImage(source);
  const scale = Math.min(
    1,
    spec.maxWidth / image.naturalWidth,
    spec.maxHeight / image.naturalHeight,
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new ImageRejectedError('This browser could not process the image.');
  }
  context.drawImage(image, 0, 0, width, height);

  // WebP keeps transparency (logos) and is smallest. A browser that cannot
  // encode it silently returns PNG instead, which is large — JPEG then.
  const webp = canvas.toDataURL('image/webp', 0.85);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85);
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}
