'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/content/nav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { MobileNav } from '@/components/ui/MobileNav';

/**
 * Sticky header with a scroll spy.
 *
 * The active item is marked by INK, not by the accent — the accent is spent
 * once per screen on a call to action (§10), and a nav highlight is not where
 * that budget goes. Weight and contrast carry the state instead, which also
 * means the marker survives a colour-blind reader and forced-colors mode.
 */
export function SiteHeader() {
  const [active, setActive] = useState<string | null>(null);
  const [lifted, setLifted] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  /* The drawer must close when the route changes: a link inside it closes on
     click, but browser back/forward does not go through that handler and would
     leave the panel sitting over a new page.

     Recording WHICH path it was opened on makes that derivable rather than
     something an effect has to synchronise. `menuOpen` is then simply false on
     any other path — no setState after render, no flash of a stale open panel
     before an effect corrects it. */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const menuOpen = openedOn === pathname;

  const setMenuOpen = (open: boolean) => setOpenedOn(open ? pathname : null);

  /* The section links are anchors into the home page. On /writing those ids do
     not exist, so they have to be absolute (`/#about`) rather than bare
     fragments — a bare `#about` on another route scrolls nowhere and silently
     rewrites the URL. On the home page itself the absolute form still behaves
     as a same-page jump. */
  const isHome = pathname === '/';

  /* Scroll spy. Observing the sections directly is cheaper and steadier than
     measuring offsets on every scroll frame. The band keeps the "active"
     region near the top of the viewport, so the marker changes when a heading
     arrives rather than when a section merely appears. */
  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  /* The header carries no rule until the page has moved, so the hero opens on
     an unbroken field. */
  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-50 backdrop-blur-md transition-colors ${
          lifted ? 'border-b border-rule bg-ground/85' : 'border-b border-transparent'
        }`}
      >
        <div className="shell flex items-center justify-between gap-6 py-4">
          {/* GK is two different controls at two different sizes, rendered as
              two elements rather than one with conditional behaviour — a single
              element cannot be both a link and a disclosure button, and faking
              it costs the correct semantics for whichever one loses.

              The accessible name has to CONTAIN the visible text, or voice
              control users saying "GK" get no match. */}
          <button
            ref={menuTriggerRef}
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label="GK — open navigation menu"
            className="label flex items-center gap-2 text-ink md:hidden"
          >
            GK
            <span aria-hidden className="text-rule-2">
              ☰
            </span>
          </button>

          <Link href="/" className="label hidden text-ink md:block" aria-label="GK — home">
            GK
          </Link>

          <nav aria-label="Sections" className="hidden md:block">
            <ul className="flex items-center gap-6">
              {navItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`/#${item.id}`}
                    aria-current={isHome && active === item.id ? 'true' : undefined}
                    className={`label py-2 transition-colors hover:text-ink ${
                      isHome && active === item.id ? 'text-ink' : ''
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}

              {/* A route, not a section — so it is a Link, and it marks itself
                  active by path rather than by scroll position. */}
              <li>
                <Link
                  href="/gallery"
                  aria-current={pathname.startsWith('/gallery') ? 'true' : undefined}
                  className={`label py-2 transition-colors hover:text-ink ${
                    pathname.startsWith('/gallery') ? 'text-ink' : ''
                  }`}
                >
                  Gallery
                </Link>
              </li>

              <li>
                <Link
                  href="/writing"
                  aria-current={pathname.startsWith('/writing') ? 'true' : undefined}
                  className={`label py-2 transition-colors hover:text-ink ${
                    pathname.startsWith('/writing') ? 'text-ink' : ''
                  }`}
                >
                  Writing
                </Link>
              </li>
            </ul>
          </nav>

          <ThemeToggle />
        </div>
      </header>

      {/* Deliberately a SIBLING of the header, not a child.
          The header carries `backdrop-blur-md`, and an ancestor with a
          backdrop-filter becomes the containing block for `position: fixed`
          descendants. Nested inside, the drawer's `inset-0` resolved to the
          header's own 60px-tall box: it rendered as a stub at the top of the
          screen with its content clipped, rather than as a full-height panel.
          Same trap applies to transform, filter and will-change. */}
      <MobileNav
        open={menuOpen}
        onOpenChange={setMenuOpen}
        triggerRef={menuTriggerRef}
      />
    </>
  );
}
