'use client';

import { useEffect, useState } from 'react';
import { navItems } from '@/content/nav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

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
    <header
      className={`sticky top-0 z-50 backdrop-blur-md transition-colors ${
        lifted ? 'border-b border-rule bg-ground/85' : 'border-b border-transparent'
      }`}
    >
      <div className="shell flex items-center justify-between gap-6 py-4">
        {/* The accessible name has to CONTAIN the visible text, or voice
            control users saying "GK" get no match. */}
        <a href="#top" className="label text-ink" aria-label="GK — back to top">
          GK
        </a>

        <nav aria-label="Sections" className="hidden md:block">
          <ul className="flex items-center gap-6">
            {navItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={active === item.id ? 'true' : undefined}
                  className={`label py-2 transition-colors hover:text-ink ${
                    active === item.id ? 'text-ink' : ''
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <ThemeToggle />
      </div>
    </header>
  );
}
