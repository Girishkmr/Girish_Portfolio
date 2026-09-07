'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { PHOTO_BUCKET } from '@/lib/photo-urls';

/**
 * FR-14 write paths.
 *
 * The upload itself does NOT happen here. The browser sends the resized file
 * straight to Supabase Storage using the session's own credentials, and only
 * the resulting metadata comes through these actions. Routing image bytes
 * through a Server Action would push them into a serverless function's request
 * body — slower, subject to a payload limit, and billed as function bandwidth
 * for no benefit. Storage already enforces the same policies.
 */

export type PhotoResult = { ok: true } | { ok: false; error: string };

function slugifyAlbum(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export async function savePhotoRecord(formData: FormData): Promise<PhotoResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const storagePath = String(formData.get('storage_path') ?? '').trim();
  if (!storagePath) return { ok: false, error: 'Missing storage path.' };

  const album = slugifyAlbum(String(formData.get('album') ?? 'life')) || 'life';
  const caption = String(formData.get('caption') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const takenAt = String(formData.get('taken_at') ?? '').trim();
  const width = Number(formData.get('width') ?? 0) || null;
  const height = Number(formData.get('height') ?? 0) || null;
  const blurData = String(formData.get('blur_data') ?? '').trim();

  const supabase = await createClient();
  const { error } = await supabase.from('photos').insert({
    storage_path: storagePath,
    album,
    caption: caption || null,
    location: location || null,
    taken_at: takenAt || null,
    width,
    height,
    blur_data: blurData || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidateGallery();
  return { ok: true };
}

export async function updatePhoto(formData: FormData): Promise<PhotoResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const id = String(formData.get('id') ?? '');
  if (!id) return { ok: false, error: 'Missing id.' };

  const album = slugifyAlbum(String(formData.get('album') ?? 'life')) || 'life';
  const caption = String(formData.get('caption') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const takenAt = String(formData.get('taken_at') ?? '').trim();
  const sortOrder = Number(formData.get('sort_order') ?? 0) || 0;

  const supabase = await createClient();
  const { error } = await supabase
    .from('photos')
    .update({
      album,
      caption: caption || null,
      location: location || null,
      taken_at: takenAt || null,
      sort_order: sortOrder,
    })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  revalidateGallery();
  return { ok: true };
}

/**
 * Deletes the row AND the stored object.
 *
 * Order matters: the file goes first. If the row were deleted first and the
 * storage call then failed, the object would be orphaned — invisible in the
 * manager, still consuming the 1 GB quota, with nothing left pointing at it to
 * find it by. This way a failure leaves a row whose image is missing, which is
 * visible and fixable.
 */
export async function deletePhoto(id: string, storagePath: string): Promise<PhotoResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const supabase = await createClient();

  const { error: storageError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .remove([storagePath]);

  if (storageError) {
    console.error('[photos] storage delete failed:', storageError.message);
    return { ok: false, error: `Could not delete the file: ${storageError.message}` };
  }

  const { error } = await supabase.from('photos').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidateGallery();
  return { ok: true };
}

function revalidateGallery() {
  revalidatePath('/gallery');
  revalidatePath('/admin/photos');
}
