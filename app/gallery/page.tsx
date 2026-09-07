import type { Metadata } from 'next';
import { getAlbums, albumLabel } from '@/lib/photos';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { PhotoGrid } from '@/components/gallery/PhotoGrid';

/**
 * FR-10. Photo journal, grouped by album.
 *
 * ISR at five minutes (REQUIREMENTS.html §6). Photos change far less often
 * than posts, and each render costs a query plus however many image
 * transformations Vercel has not yet cached.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'A photo journal.',
};

export default async function GalleryPage() {
  const albums = await getAlbums();
  const total = albums.reduce((sum, album) => sum + album.photos.length, 0);

  return (
    <main id="main" className="flex-1">
      <div className="shell py-20 lg:py-28">
        <header className="mb-12">
          <p className="label mb-3">Gallery</p>
          <h1 className="display text-4xl lg:text-5xl">Photographs</h1>
          {total > 0 ? (
            <p className="label mt-4 tabular-nums">
              {total} photo{total === 1 ? '' : 's'} · {albums.length} album
              {albums.length === 1 ? '' : 's'}
            </p>
          ) : null}
        </header>

        {albums.length === 0 ? (
          <p className="border-t border-rule pt-8 leading-relaxed text-ink-2">
            {isSupabaseConfigured
              ? 'No photographs yet.'
              : 'The gallery is not connected yet — this deployment has no database credentials configured.'}
          </p>
        ) : (
          <div className="flex flex-col gap-16">
            {albums.map((album) => (
              <section key={album.name} aria-labelledby={`album-${album.name}`}>
                <h2
                  id={`album-${album.name}`}
                  className="display mb-5 border-t border-rule pt-5 text-2xl"
                >
                  {albumLabel(album.name)}
                </h2>
                <PhotoGrid photos={album.photos} />
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
