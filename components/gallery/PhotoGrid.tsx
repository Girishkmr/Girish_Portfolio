'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import type { PhotoRow } from '@/types/database';
import { photoUrl } from '@/lib/photo-urls';
import { Lightbox } from '@/components/gallery/Lightbox';

/**
 * FR-10's masonry grid.
 *
 * CSS columns, not a JS masonry library. Columns get the ragged-bottom look
 * for free, reflow at every breakpoint without a resize listener, and add
 * nothing to the bundle. The trade is reading order: columns flow top-to-bottom
 * then across, so the visual order is not the DOM order. That is acceptable
 * for a gallery — the photos are a set, not a sequence — and the lightbox
 * navigates in true array order regardless of where a tile sits.
 *
 * Each tile is a real `<button>`. A div with an onClick is not reachable by
 * keyboard and announces nothing; the whole lightbox is useless without this.
 */
export function PhotoGrid({ photos }: { photos: PhotoRow[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const triggersRef = useRef<(HTMLButtonElement | null)[]>([]);

  function close() {
    const restoreTo = openIndex;
    setOpenIndex(null);
    // Return focus to the thumbnail that opened the dialog, after React has
    // removed it from the tree.
    requestAnimationFrame(() => {
      if (restoreTo !== null) triggersRef.current[restoreTo]?.focus();
    });
  }

  return (
    <>
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            ref={(el) => {
              triggersRef.current[index] = el;
            }}
            type="button"
            onClick={() => setOpenIndex(index)}
            aria-haspopup="dialog"
            className="block w-full cursor-zoom-in overflow-hidden rounded-sm border border-rule transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Image
              src={photoUrl(photo.storage_path)}
              alt={photo.caption ?? 'Photograph'}
              width={photo.width ?? 800}
              height={photo.height ?? 1000}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              placeholder={photo.blur_data ? 'blur' : 'empty'}
              blurDataURL={photo.blur_data ?? undefined}
              className="h-auto w-full"
            />
          </button>
        ))}
      </div>

      {openIndex !== null ? (
        <Lightbox
          photos={photos}
          index={openIndex}
          onClose={close}
          onNavigate={setOpenIndex}
        />
      ) : null}
    </>
  );
}
