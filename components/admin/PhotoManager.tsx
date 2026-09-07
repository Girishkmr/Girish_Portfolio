'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { prepareImage, storageKey, MAX_EDGE } from '@/lib/image-resize';
import { deletePhoto, savePhotoRecord, updatePhoto } from '@/app/admin/photo-actions';
import { photoUrl, PHOTO_BUCKET, albumLabel } from '@/lib/photo-urls';
import type { PhotoRow } from '@/types/database';

/**
 * FR-14. Upload, caption, reorder, delete.
 *
 * Files go **straight from the browser to Supabase Storage**, not through a
 * Server Action — see the note in app/admin/photo-actions.ts. Only the
 * resulting metadata round-trips to the server.
 *
 * Uploads run one at a time rather than in parallel. Ten phone photos resizing
 * simultaneously will pin a laptop's CPU and can exhaust memory on a phone,
 * and the sequential version gives honest per-file progress instead of a bar
 * that jumps from 0 to 100.
 */

type Progress = { name: string; state: 'resizing' | 'uploading' | 'done' | 'failed'; error?: string };

export function PhotoManager({ photos }: { photos: PhotoRow[] }) {
  const [album, setAlbum] = useState('life');
  const [progress, setProgress] = useState<Progress[]>([]);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    event.target.value = ''; // allow re-selecting the same file after a failure
    setBusy(true);
    setError(null);
    setProgress(files.map((file) => ({ name: file.name, state: 'resizing' })));

    const supabase = createClient();
    const targetAlbum = album.trim() || 'life';

    for (const [index, file] of files.entries()) {
      const mark = (state: Progress['state'], message?: string) =>
        setProgress((current) =>
          current.map((item, i) =>
            i === index ? { ...item, state, error: message } : item,
          ),
        );

      try {
        const prepared = await prepareImage(file);
        mark('uploading');

        const key = storageKey(targetAlbum, prepared.extension);
        const { error: uploadError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(key, prepared.blob, {
            contentType: prepared.blob.type,
            cacheControl: '31536000',
            upsert: false,
          });

        if (uploadError) {
          mark('failed', uploadError.message);
          continue;
        }

        const formData = new FormData();
        formData.set('storage_path', key);
        formData.set('album', targetAlbum);
        formData.set('width', String(prepared.width));
        formData.set('height', String(prepared.height));
        formData.set('blur_data', prepared.blurData);

        const result = await savePhotoRecord(formData);

        if (!result.ok) {
          // The object uploaded but the row did not save. Remove the file so
          // it does not sit in the bucket unreferenced, consuming quota with
          // nothing in the UI able to find it.
          await supabase.storage.from(PHOTO_BUCKET).remove([key]);
          mark('failed', result.error);
          continue;
        }

        mark('done');
      } catch (cause) {
        mark('failed', cause instanceof Error ? cause.message : 'Could not process the file.');
      }
    }

    setBusy(false);
  }

  function onSaveDetails(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updatePhoto(formData);
      if (!result.ok) setError(result.error);
    });
  }

  function onDelete(photo: PhotoRow) {
    setError(null);
    startTransition(async () => {
      const result = await deletePhoto(photo.id, photo.storage_path);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="border border-rule bg-surface p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <label htmlFor="album" className="label">
              Album
            </label>
            <input
              id="album"
              value={album}
              onChange={(event) => setAlbum(event.target.value)}
              placeholder="life"
              className="max-w-xs rounded-sm border border-rule bg-ground px-3 py-2 text-ink outline-none focus-visible:border-ink-3"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="files" className="label">
              Add photos
            </label>
            <input
              id="files"
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              onChange={onFiles}
              className="text-sm text-ink-2 file:mr-3 file:rounded-sm file:border file:border-rule file:bg-ground file:px-3 file:py-1.5 file:text-sm file:text-ink"
            />
            <p className="text-sm text-ink-3">
              Resized to {MAX_EDGE}px and converted to WebP in your browser before
              upload, so a 8 MB photo arrives as a few hundred KB.
            </p>
          </div>
        </div>

        {progress.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-1 border-t border-rule pt-3">
            {progress.map((item) => (
              <li key={item.name} className="flex flex-wrap gap-x-3 text-sm">
                <span className="text-ink-2">{item.name}</span>
                <span
                  className={
                    item.state === 'failed'
                      ? 'text-accent'
                      : item.state === 'done'
                        ? 'text-ink-3'
                        : 'text-ink-2'
                  }
                >
                  {item.state}
                  {item.error ? ` — ${item.error}` : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {error ? (
        <p role="alert" className="text-sm text-ink-2">
          {error}
        </p>
      ) : null}

      <section>
        <h2 className="label mb-4 border-t border-rule pt-4">
          {photos.length} photo{photos.length === 1 ? '' : 's'}
        </h2>

        {photos.length === 0 ? (
          <p className="text-sm text-ink-3">Nothing uploaded yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {photos.map((photo) => (
              <li
                key={photo.id}
                className="flex flex-col gap-4 border border-rule bg-surface p-3 sm:flex-row"
              >
                <Image
                  src={photoUrl(photo.storage_path)}
                  alt={photo.caption ?? 'Photograph'}
                  width={photo.width ?? 400}
                  height={photo.height ?? 300}
                  sizes="160px"
                  className="h-28 w-40 shrink-0 rounded-sm border border-rule object-cover"
                />

                <form action={onSaveDetails} className="flex min-w-0 flex-1 flex-col gap-2">
                  <input type="hidden" name="id" value={photo.id} />

                  <input
                    name="caption"
                    defaultValue={photo.caption ?? ''}
                    placeholder="Caption"
                    className="rounded-sm border border-rule bg-ground px-2.5 py-1.5 text-sm text-ink outline-none focus-visible:border-ink-3"
                  />

                  <div className="flex flex-wrap gap-2">
                    <input
                      name="album"
                      defaultValue={photo.album}
                      aria-label="Album"
                      className="w-32 rounded-sm border border-rule bg-ground px-2.5 py-1.5 text-sm text-ink outline-none focus-visible:border-ink-3"
                    />
                    <input
                      name="taken_at"
                      type="date"
                      defaultValue={photo.taken_at ?? ''}
                      aria-label="Date taken"
                      className="rounded-sm border border-rule bg-ground px-2.5 py-1.5 text-sm text-ink outline-none focus-visible:border-ink-3"
                    />
                    <input
                      name="location"
                      defaultValue={photo.location ?? ''}
                      placeholder="Location"
                      className="w-40 rounded-sm border border-rule bg-ground px-2.5 py-1.5 text-sm text-ink outline-none focus-visible:border-ink-3"
                    />
                    <input
                      name="sort_order"
                      type="number"
                      defaultValue={photo.sort_order}
                      aria-label="Sort order"
                      title="Lower numbers appear first within an album"
                      className="w-20 rounded-sm border border-rule bg-ground px-2.5 py-1.5 text-sm text-ink outline-none focus-visible:border-ink-3"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={pending}
                      className="label rounded-sm border border-rule px-2.5 py-1 hover:border-ink-3 hover:text-ink disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(photo)}
                      disabled={pending}
                      className="label hover:text-ink disabled:opacity-40"
                    >
                      Delete
                    </button>
                    <span className="label text-ink-3">{albumLabel(photo.album)}</span>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
