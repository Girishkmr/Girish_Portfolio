'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { navItems } from '@/content/nav';

/**
 * The mobile navigation drawer.
 *
 * Below `md` the desktop nav is hidden, which left the small-screen header with
 * nothing but the GK mark and the theme toggle — no way to reach any section,
 * the gallery or the writing feed. A top bar cannot hold nine destinations at
 * 360px, so the GK mark becomes the trigger and the destinations move into a
 * panel.
 *
 * The accessibility work here is the same set the lightbox needed, for the same
 * reason — this is a modal surface:
 *
 *  - The trigger is a real `<button>` carrying `aria-expanded` and
 *    `aria-controls`, so assistive tech announces it as a disclosure rather
 *    than as a mysterious letter.
 *  - Focus moves into the panel on open, is trapped while it is open, and
 *    returns to the trigger on close. Without the last part, closing the panel
 *    drops a keyboard user back at the top of the document.
 *  - Escape closes it.
 *  - Background scroll is locked and restored to its previous value.
 *  - Any navigation closes it, including a same-page hash jump — that does not
 *    unmount anything, so nothing else would.
 */

/** Routes are separate from sections: they are pages, not anchors. */
const ROUTES = [
  { href: '/gallery', label: 'Gallery' },
  { href: '/writing', label: 'Writing' },
];

export function MobileNav({
  open,
  onOpenChange,
  triggerRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  /* Escape, plus the focus trap. */
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
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
  }, [open, onOpenChange]);

  /* Lock background scroll while open, restoring whatever was there before
     rather than assuming it was the default. */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  /* Move focus into the panel on open, and back to the trigger on close.
     The trap above has nothing to hold on to until focus is inside.

     `hasOpened` is why this is not a two-line effect: on first mount `open` is
     false, so an unguarded version would call focus() on the trigger during
     page load — stealing focus from the document, scrolling the header into
     view, and firing on every mobile visit. Focus may only be *restored* to
     somewhere it once was. */
  const hasOpened = useRef(false);

  useEffect(() => {
    if (open) {
      hasOpened.current = true;
      panelRef.current?.querySelector<HTMLElement>('a[href], button')?.focus();
    } else if (hasOpened.current) {
      triggerRef.current?.focus();
    }
    // triggerRef is a ref object and stable; only `open` should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const close = () => onOpenChange(false);

  return (
    <div className="fixed inset-0 z-[90] md:hidden">
      {/* Backdrop. A plain div rather than a button: it is decorative, the
          panel already has a labelled Close control, and an enormous unlabelled
          button in the tab order helps nobody. */}
      <div
        className="absolute inset-0 bg-ground/80 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col border-r border-rule bg-ground shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <Link href="/" onClick={close} className="label text-ink">
            Girish Kumar
          </Link>
          <button
            type="button"
            onClick={close}
            className="label rounded-sm border border-rule px-2.5 py-1 hover:border-ink-3 hover:text-ink"
          >
            Close
          </button>
        </div>

        <nav aria-label="Sections" className="flex-1 overflow-y-auto px-5 py-6">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.id}>
                {/* Absolute, not a bare fragment: on /gallery or /writing these
                    ids do not exist, and `#about` there would scroll nowhere
                    while silently rewriting the URL. */}
                <a
                  href={`/#${item.id}`}
                  onClick={close}
                  className="block py-2.5 text-lg text-ink-2 transition-colors hover:text-ink"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <ul className="mt-6 flex flex-col gap-1 border-t border-rule pt-6">
            {ROUTES.map((route) => (
              <li key={route.href}>
                <Link
                  href={route.href}
                  onClick={close}
                  className="block py-2.5 text-lg text-ink-2 transition-colors hover:text-ink"
                >
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
