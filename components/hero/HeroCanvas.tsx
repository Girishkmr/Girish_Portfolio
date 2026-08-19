'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useMediaQuery, useTheme } from '@/components/ui/theme';
import { HeroPoster } from './HeroPoster';
import type { Palette } from './PipelineField';

/**
 * Decides whether the hero gets a WebGL layer at all, and what it is drawn in.
 *
 * Three gates, in order of how much they matter:
 *   1. prefers-reduced-motion — the poster is the final state, not a fallback.
 *   2. viewport under 768px — a phone pays for the canvas in battery and main
 *      thread, on the screen where the hero text needs the room anyway.
 *   3. hydration — `useTheme()` returns null until the client has read the
 *      DOM, and the canvas needs real token values, not guesses.
 *
 * Nothing here is load-bearing for content: the name, the tagline and both
 * calls to action are plain DOM in Hero.tsx and are unaffected by all of it.
 */

const PipelineField = dynamic(() => import('./PipelineField'), {
  ssr: false,
  loading: () => null,
});

export function HeroCanvas() {
  const theme = useTheme();
  const wideEnough = useMediaQuery('(min-width: 768px)');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [ready, setReady] = useState(false);

  const enabled = theme !== null && wideEnough && !reducedMotion;

  /* Resolved from the CSS custom properties rather than duplicated here, so
     the canvas can never drift from the token system the rest of the site is
     drawn in. Re-resolves when the theme changes. */
  const palette = useMemo<Palette | null>(() => {
    if (theme === null) return null;

    const styles = getComputedStyle(document.documentElement);
    const read = (name: string) => styles.getPropertyValue(name).trim();

    return {
      node: read('--ink-3'),
      accent: read('--accent'),
      edge: read('--rule-2'),
    };
  }, [theme]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 right-0 w-full overflow-hidden lg:w-[58%] [mask-image:linear-gradient(to_right,transparent,black_38%)]"
    >
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          ready ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <HeroPoster />
      </div>

      {enabled && palette && (
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            ready ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <PipelineField palette={palette} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
