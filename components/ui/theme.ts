'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_EVENT = 'themechange';

/**
 * The active theme genuinely lives outside React — the inline boot script in
 * layout.tsx sets `data-theme` before hydration, and the OS setting can change
 * under us. So it is read as an external store rather than mirrored into
 * state, which is both correct and what keeps the DOM and React in agreement.
 */
function subscribeTheme(onChange: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    mq.removeEventListener('change', onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function getThemeSnapshot(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark' || attr === 'light') return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** null on the server and during hydration, so the markup can't mismatch. */
function getThemeServerSnapshot(): Theme | null {
  return null;
}

export function useTheme(): Theme | null {
  return useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
}

export function setTheme(next: Theme) {
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem('theme', next);
  } catch {
    /* private mode — the choice just won't persist */
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * Media queries are an external store too. Reading them this way rather than
 * with an effect keeps state out of the render/effect cycle entirely, and the
 * server snapshot of `false` means anything gated on a query is off until the
 * client has actually measured.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
