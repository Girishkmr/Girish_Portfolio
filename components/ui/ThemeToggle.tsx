'use client';

import { setTheme, useTheme } from '@/components/ui/theme';

export function ThemeToggle() {
  const theme = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
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
