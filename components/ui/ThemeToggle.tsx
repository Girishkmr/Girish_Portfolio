'use client';

import { useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';

const THEME_EVENT = 'themechange';

/**
 * The active theme genuinely lives outside React — the inline boot script in
 * layout.tsx sets `data-theme` before hydration, and the OS setting can change
 * under us. So it is read as an external store rather than mirrored into
 * state, which is both correct and what keeps the DOM and React in agreement.
 */
function subscribe(onChange: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    mq.removeEventListener('change', onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function getSnapshot(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark' || attr === 'light') return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** null on the server and during hydration, so the markup can't mismatch. */
function getServerSnapshot(): Theme | null {
  return null;
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* private mode — the choice just won't persist */
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === null
          ? 'Toggle colour theme'
          : `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`
      }
      className="label rounded-sm border border-rule px-2.5 py-1.5 transition-colors hover:border-rule-2 hover:text-ink"
    >
      {theme === null ? '···' : theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}
