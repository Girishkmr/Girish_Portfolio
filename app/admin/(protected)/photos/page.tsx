import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PhotoManager } from '@/components/admin/PhotoManager';
import type { PhotoRow } from '@/types/database';

export const metadata: Metadata = {
  title: 'Photos',
  robots: { index: false, follow: false },
};

/** FR-14. Upload, caption, order and delete. */
export default async function PhotosPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .order('album', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  const photos: PhotoRow[] = data ?? [];

  return (
    <div className="shell py-16">
      <p className="label mb-3">Admin</p>
      <h1 className="display mb-10 text-3xl lg:text-4xl">Photos</h1>

      {error ? (
        <p role="alert" className="mb-8 leading-relaxed text-ink-2">
          Could not load photos: {error.message}
        </p>
      ) : null}

      <PhotoManager photos={photos} />
    </div>
  );
}
