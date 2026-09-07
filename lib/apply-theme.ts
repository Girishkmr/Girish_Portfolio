import {
  DEFAULT_CHOICE,
  FONT_PAIRINGS,
  PALETTES,
  TYPE_SCALES,
  type ThemeChoice,
} from '@/content/themes';

/**
 * Turns a theme choice into inline custom properties on `<html>`.
 *
 * Inline styles on the root element are the right mechanism here because they
 * beat the stylesheet without `!important` and without regenerating CSS: the
 * cascade already puts an element's own style attribute above a rule in a
 * sheet. Every component reads `var(--ink)`, so overriding the variable is
 * enough — nothing needs to know a theme changed.
 *
 * Both light and dark values are written at once, under distinct names, and a
 * small stylesheet rule picks whichever the active theme wants. Writing only
 * the current mode's values would mean the toggle stopped working the moment
 * an override was applied.
 */

const TOKENS = [
  'ground',
  'surface',
  'surface-2',
  'ink',
  'ink-2',
  'ink-3',
  'rule',
  'rule-2',
  'accent',
  'accent-fg',
] as const;

/**
 * The serialisable form of a choice.
 *
 * This exact shape is what the boot script in `app/layout.tsx` reads and
 * replays before first paint — so a stored theme is applied *before* the
 * browser draws anything, rather than flashing the default and correcting
 * itself a moment later. Change this shape and that script must change too.
 */
export type ThemeOverride = {
  tokens: Record<string, string>;
  lab: boolean;
  labFont: boolean;
  labScale: boolean;
};

export function buildOverride(choice: ThemeChoice): ThemeOverride {
  const palette = PALETTES.find((p) => p.id === choice.paletteId);
  const fonts = FONT_PAIRINGS.find((f) => f.id === choice.fontId);
  const scale = TYPE_SCALES.find((s) => s.id === choice.scaleId);

  const tokens: Record<string, string> = {};

  if (palette) {
    for (const token of TOKENS) {
      tokens[`--lab-light-${token}`] = palette.light[token];
      tokens[`--lab-dark-${token}`] = palette.dark[token];
    }
  }
  if (fonts) {
    tokens['--lab-display'] = fonts.display;
    tokens['--lab-body'] = fonts.body;
    tokens['--lab-mono'] = fonts.mono;
  }
  if (scale) {
    tokens['--lab-scale'] = String(scale.scale);
  }

  return {
    tokens,
    lab: Boolean(palette),
    labFont: Boolean(fonts),
    labScale: Boolean(scale),
  };
}

export function applyOverride(override: ThemeOverride): void {
  const root = document.documentElement;

  for (const [name, value] of Object.entries(override.tokens)) {
    root.style.setProperty(name, value);
  }

  if (override.lab) root.dataset.lab = 'on';
  if (override.labFont) root.dataset.labFont = 'on';
  if (override.labScale) root.dataset.labScale = 'on';
}

export function applyThemeChoice(choice: ThemeChoice): ThemeOverride {
  const override = buildOverride(choice);
  applyOverride(override);
  return override;
}

/** Removes every override, returning the site to what `globals.css` defines. */
export function clearThemeChoice(): void {
  const root = document.documentElement;

  for (const token of TOKENS) {
    root.style.removeProperty(`--lab-light-${token}`);
    root.style.removeProperty(`--lab-dark-${token}`);
  }
  root.style.removeProperty('--lab-display');
  root.style.removeProperty('--lab-body');
  root.style.removeProperty('--lab-mono');
  root.style.removeProperty('--lab-scale');

  delete root.dataset.lab;
  delete root.dataset.labFont;
  delete root.dataset.labScale;
}

export function readStoredChoice(raw: string | null): ThemeChoice | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ThemeChoice>;
    if (!parsed.paletteId) return null;
    return { ...DEFAULT_CHOICE, ...parsed };
  } catch {
    return null;
  }
}

/**
 * The chosen palette as CSS you can paste into `globals.css`.
 *
 * This is the point of the whole lab. Overrides live in one browser's
 * localStorage — useful for judging a design against real content, useless as
 * a way to ship it. Nothing here writes to the database, deliberately: the
 * home page is static and must not gain a data dependency for a colour scheme.
 * You preview here, then bake the winner into the stylesheet.
 */
export function exportPaletteCss(choice: ThemeChoice): string {
  const palette = PALETTES.find((p) => p.id === choice.paletteId);
  const fonts = FONT_PAIRINGS.find((f) => f.id === choice.fontId);
  if (!palette) return '';

  const block = (tokens: Record<string, string>, indent: string) =>
    TOKENS.map((t) => `${indent}--${t}: ${tokens[t]};`).join('\n');

  return `/* ${palette.name} — ${palette.note}
   Generated from /admin/theme. Verified against WCAG AA by
   scripts/check-contrast.mjs before it was offered. */

:root {
${block(palette.light, '  ')}

  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${block(palette.dark, '    ')}

    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
${block(palette.dark, '  ')}

  color-scheme: dark;
}
${
  fonts
    ? `
/* Fonts — ${fonts.name}
   Only the stacks change here. Swapping the loaded faces themselves means
   editing the next/font calls at the top of app/layout.tsx. */
/*
  --font-display: ${fonts.display};
  --font-body:    ${fonts.body};
  --font-mono:    ${fonts.mono};
*/`
    : ''
}
`;
}
