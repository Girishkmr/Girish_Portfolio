'use client';

import { useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { PhotoRow } from '@/types/database';
import { photoUrl } from '@/lib/photo-urls';

/**
 * FR-10's lightbox.
 *
 * The accessibility requirements in §4 are the design here, not a coat of
 * paint over it:
 *
 *  - **Focus is trapped.** A modal that leaves focus behind it lets a keyboard
 *    user tab into a page they cannot see, with no way back.
 *  - **Escape closes**, and focus returns to the thumbnail that opened it —
 *    otherwise closing dumps you at the top of the document, having lost your
 *    place in a grid of eighty photos.
 *  - **Arrow keys move** between photos, because that is what every image
 *    viewer has done for thirty years.
 *  - **Background scroll is locked**, or the page slides underneath the
 *    overlay while you are looking at it.
 */
export function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: PhotoRow[];
  index: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const photo = photos[index];

  const goPrevious = useCallback(() => {
    onNavigate((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onNavigate]);

  const goNext = useCallback(() => {
    onNavigate((index + 1) % photos.length);
  }, [index, photos.length, onNavigate]);

  /* Keyboard handling and the focus trap share one listener: both are about
     what a key does while the dialog owns the screen. */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrevious();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
        return;
      }
      if (event.key !== 'Tab') return;

      // Focus trap: wrap at both ends of the dialog's tabbable elements.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, goPrevious, goNext]);

  /* Lock background scroll for as long as the dialog is open, restoring the
     previous value rather than assuming it was 'visible'. */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  /* Move focus into the dialog on open. Without this the trap above has
     nothing to trap, and a screen reader stays announcing the page behind. */
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  if (!photo) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption ?? 'Photograph'}
      className="fixed inset-0 z-[100] flex flex-col bg-ground/95 backdrop-blur-sm"
      /* Clicking the backdrop closes; clicking the image must not. The check
         is on the event target rather than a stopPropagation on the child,
         which would also swallow legitimate clicks inside it. */
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3">
        <p className="label tabular-nums">
          {index + 1} / {photos.length}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrevious}
            className="label rounded-sm border border-rule px-3 py-1.5 hover:border-ink-3 hover:text-ink"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={goNext}
            className="label rounded-sm border border-rule px-3 py-1.5 hover:border-ink-3 hover:text-ink"
          >
            Next →
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="label rounded-sm border border-rule px-3 py-1.5 hover:border-ink-3 hover:text-ink"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <Image
          src={photoUrl(photo.storage_path)}
          alt={photo.caption ?? 'Photograph'}
          width={photo.width ?? 1600}
          height={photo.height ?? 1200}
          sizes="100vw"
          className="max-h-full w-auto max-w-full object-contain"
          priority
        />
      </div>

      {photo.caption || photo.taken_at || photo.location ? (
        <div className="border-t border-rule px-5 py-4">
          {photo.caption ? (
            <p className="max-w-[70ch] leading-relaxed text-ink-2">{photo.caption}</p>
          ) : null}
          <p className="label mt-2 flex flex-wrap gap-x-3">
            {photo.taken_at ? (
              <time dateTime={photo.taken_at}>
                {new Date(photo.taken_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            ) : null}
            {photo.location ? <span>{photo.location}</span> : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}
