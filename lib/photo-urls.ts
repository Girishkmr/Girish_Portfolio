import { supabaseUrl } from '@/lib/supabase/config';

/**
 * Client-safe photo helpers.
 *
 * These are separate from `lib/photos.ts` because that module is marked
 * `server-only` — it holds the database queries — and the grid, the lightbox
 * and the photo manager are all Client Components that need to build an image
 * URL. Importing a `server-only` module from any of them is a build error, by
 * design: the point of the marker is that it fails loudly rather than quietly
 * shipping server code to the browser.
 *
 * Nothing here touches the database or reads a secret. `supabaseUrl` comes
 * from a `NEXT_PUBLIC_` variable and is already in the client bundle.
 */

export const PHOTO_BUCKET = 'photos';

/**
 * Public URL for a stored object.
 *
 * Built by string concatenation rather than `supabase.storage.getPublicUrl()`
 * so a component can call it without instantiating a Supabase client purely to
 * format a string. The path shape is a documented, stable part of Supabase's
 * public API.
 */
export function photoUrl(storagePath: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${PHOTO_BUCKET}/${storagePath}`;
}

/** Turns an album slug into something a human reads. */
export function albumLabel(album: string): string {
  return album
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
