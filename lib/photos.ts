import 'server-only';

import { createPublicClient } from '@/lib/supabase/public';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { PhotoRow } from '@/types/database';

// Re-exported so server callers have one import for photos, while the
// definitions stay in a module Client Components may also import.
export { PHOTO_BUCKET, photoUrl, albumLabel } from '@/lib/photo-urls';

/**
 * Gallery reads (FR-10).
 *
 * Cookie-free, like the writing feed and for the same reason: a published
 * photo is identical for every visitor, so the read needs no session and
 * asking for one would force the route dynamic and lose ISR.
 *
 * Never throws. An empty gallery is a worse page; a 500 is a broken site.
 */

export type Album = {
  name: string;
  photos: PhotoRow[];
};

export async function getPhotos(): Promise<PhotoRow[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('album', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[photos] query failed:', error.message);
      return [];
    }

    return data ?? [];
  } catch (error) {
    console.error('[photos] query threw:', error);
    return [];
  }
}

/**
 * Photos grouped into albums, preserving the query's ordering.
 *
 * A Map keeps insertion order, so albums come out in the order the database
 * sorted them rather than in whatever order object keys happen to enumerate.
 */
export async function getAlbums(): Promise<Album[]> {
  const photos = await getPhotos();
  const albums = new Map<string, PhotoRow[]>();

  for (const photo of photos) {
    const existing = albums.get(photo.album);
    if (existing) existing.push(photo);
    else albums.set(photo.album, [photo]);
  }

  return [...albums.entries()].map(([name, items]) => ({ name, photos: items }));
}
