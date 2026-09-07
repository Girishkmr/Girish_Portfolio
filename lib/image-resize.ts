/**
 * Client-side image downscaling, before anything is uploaded.
 *
 * REQUIREMENTS.html §12 is blunt about why: Supabase Free gives 1 GB of
 * storage, and modern phone photos are 4–12 MB each. Fifty of them fills half
 * the quota with pixels no browser will ever display at full size. Resizing to
 * 2400px and re-encoding as WebP typically turns an 8 MB JPEG into 300–600 KB.
 *
 * Doing it in the browser rather than in a function is deliberate: the bytes
 * never cross the network at full size, so the slow part of the upload gets
 * ~15× shorter on a phone connection, and no server pays to receive them.
 *
 * `createImageBitmap` + canvas is used rather than an <img> and onload because
 * it decodes off the main thread and does not need the file in the DOM.
 */

export const MAX_EDGE = 2400;
export const WEBP_QUALITY = 0.82;

export type PreparedImage = {
  blob: Blob;
  width: number;
  height: number;
  /** Tiny base64 WebP, inlined into the row as a blur placeholder. */
  blurData: string;
  extension: string;
};

export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const blob = await drawToBlob(bitmap, width, height, WEBP_QUALITY);
  const blurData = await makeBlurPlaceholder(bitmap);

  bitmap.close();

  return {
    blob,
    width,
    height,
    blurData,
    extension: blob.type === 'image/webp' ? 'webp' : 'jpg',
  };
}

async function drawToBlob(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable in this browser.');

  context.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    // Safari historically ignored the WebP type here and silently produced a
    // PNG. The caller reads blob.type rather than assuming, so a fallback
    // format still gets the right extension.
    canvas.toBlob(resolve, 'image/webp', quality),
  );

  if (!blob) throw new Error('Could not encode the image.');
  return blob;
}

/**
 * A 16px-wide WebP, base64-encoded, for `next/image`'s blur placeholder.
 *
 * Kept this small on purpose: the string is stored in the database row and
 * inlined into the HTML of every gallery page, so a "slightly nicer" 64px
 * version would multiply the page weight by the number of photos.
 */
async function makeBlurPlaceholder(bitmap: ImageBitmap): Promise<string> {
  const width = 16;
  const height = Math.max(1, Math.round((bitmap.height / bitmap.width) * width));

  const blob = await drawToBlob(bitmap, width, height, 0.5);

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the placeholder.'));
    reader.readAsDataURL(blob);
  });
}

/** Storage keys must be URL-safe and unique; the original name is not either. */
export function storageKey(album: string, extension: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const random = Math.random().toString(36).slice(2, 10);
  return `${album}/${stamp}-${random}.${extension}`;
}
