/**
 * Palettes and font pairings offered by the theme lab (`/admin/theme`).
 *
 * Each palette is a complete set of the tokens `globals.css` defines, for both
 * themes. Nothing else in the site needs to know a palette changed — every
 * component reads `var(--ink)`, `var(--accent)` and so on, which is the whole
 * reason a live swap is possible at all.
 *
 * Every pair here is contrast-checked by `scripts/check-contrast.mjs`, which
 * refuses to pass a palette failing WCAG AA. Do not add one by eye.
 *
 * The four rules from REQUIREMENTS.html §10 still apply to anything added:
 *   1. Ground is never pure black — a canvas edge needs somewhere to sit.
 *   2. ONE accent, spent in one place. The moment it appears on tags, headings,
 *      borders and links at once it stops being an accent.
 *   3. Three faces, three jobs.
 *   4. Light theme is not optional.
 */

export type PaletteTokens = {
  ground: string;
  surface: string;
  'surface-2': string;
  ink: string;
  'ink-2': string;
  'ink-3': string;
  rule: string;
  'rule-2': string;
  accent: string;
  'accent-fg': string;
};

export type Palette = {
  id: string;
  name: string;
  /** One line on the character it gives the page. */
  note: string;
  light: PaletteTokens;
  dark: PaletteTokens;
};

export const PALETTES: Palette[] = [
  {
    id: 'ink-amber',
    name: 'Ink & Amber',
    note: 'The current look. Deep blue-ink ground, one warm amber accent. Quiet and editorial.',
    light: {
      ground: '#fafaf8',
      surface: '#ffffff',
      'surface-2': '#f0f0ec',
      ink: '#14181f',
      'ink-2': '#4a5260',
      'ink-3': '#6b7280',
      rule: '#e2e2dc',
      'rule-2': '#c9c9c1',
      accent: '#8f5a12',
      'accent-fg': '#ffffff',
    },
    dark: {
      ground: '#0c0f14',
      surface: '#141922',
      'surface-2': '#080b0f',
      ink: '#e8eaed',
      'ink-2': '#9aa2af',
      'ink-3': '#8a93a3',
      rule: '#1e242e',
      'rule-2': '#2c3441',
      accent: '#e0a048',
      'accent-fg': '#0c0f14',
    },
  },
  {
    id: 'bone-oxblood',
    name: 'Bone & Oxblood',
    note: 'Warm paper, near-black text, deep red accent. Reads like a printed journal — the most "designed" option here.',
    light: {
      ground: '#f7f4ef',
      surface: '#fffdf9',
      'surface-2': '#efeae1',
      ink: '#1c1917',
      'ink-2': '#514a44',
      'ink-3': '#6b625a',
      rule: '#e3ddd2',
      'rule-2': '#c9c1b4',
      accent: '#8c2f1f',
      'accent-fg': '#fffdf9',
    },
    dark: {
      ground: '#14110f',
      surface: '#1e1a17',
      'surface-2': '#0d0b0a',
      ink: '#ede8e1',
      'ink-2': '#a89e94',
      'ink-3': '#93887d',
      rule: '#2a2521',
      'rule-2': '#3c352f',
      accent: '#e08b76',
      'accent-fg': '#14110f',
    },
  },
  {
    id: 'graphite-sage',
    name: 'Graphite & Sage',
    note: 'Cool neutral ground, muted green accent. Calm and technical; the least attention-seeking option.',
    light: {
      ground: '#f6f7f6',
      surface: '#ffffff',
      'surface-2': '#eceeec',
      ink: '#16191a',
      'ink-2': '#4b5254',
      'ink-3': '#666d6e',
      rule: '#e0e3e1',
      'rule-2': '#c5cac7',
      accent: '#2f6b52',
      'accent-fg': '#ffffff',
    },
    dark: {
      ground: '#0d1110',
      surface: '#161b1a',
      'surface-2': '#080b0a',
      ink: '#e6eae8',
      'ink-2': '#9aa5a1',
      'ink-3': '#899491',
      rule: '#1f2624',
      'rule-2': '#2d3634',
      accent: '#6cc7a3',
      'accent-fg': '#0d1110',
    },
  },
  {
    id: 'paper-indigo',
    name: 'Paper & Indigo',
    note: 'Bright and conventional, deep indigo accent. The safest choice for a recruiter skimming on a bad screen.',
    light: {
      ground: '#fcfcfd',
      surface: '#ffffff',
      'surface-2': '#f1f2f6',
      ink: '#15171c',
      'ink-2': '#474d59',
      'ink-3': '#646b78',
      rule: '#e4e6ec',
      'rule-2': '#c8ccd6',
      accent: '#3b3ea8',
      'accent-fg': '#ffffff',
    },
    dark: {
      ground: '#0b0d12',
      surface: '#151821',
      'surface-2': '#07090d',
      ink: '#e9eaf0',
      'ink-2': '#9ba1b2',
      'ink-3': '#8b91a3',
      rule: '#1d2130',
      'rule-2': '#2b3040',
      accent: '#9ba2ff',
      'accent-fg': '#0b0d12',
    },
  },
  {
    id: 'carbon-signal',
    name: 'Carbon & Signal',
    note: 'Darkest ground, hot orange accent. High energy — closest to a product site, furthest from a CV.',
    light: {
      ground: '#f7f7f7',
      surface: '#ffffff',
      'surface-2': '#ededed',
      ink: '#131313',
      'ink-2': '#4c4c4c',
      'ink-3': '#666666',
      rule: '#e2e2e2',
      'rule-2': '#c6c6c6',
      accent: '#a53a09',
      'accent-fg': '#ffffff',
    },
    dark: {
      ground: '#0a0a0a',
      surface: '#151515',
      'surface-2': '#050505',
      ink: '#ededed',
      'ink-2': '#9e9e9e',
      'ink-3': '#8c8c8c',
      rule: '#1f1f1f',
      'rule-2': '#2e2e2e',
      accent: '#ff8a4c',
      'accent-fg': '#0a0a0a',
    },
  },
];

/* ------------------------------------------------------------------- fonts */

export type FontPairing = {
  id: string;
  name: string;
  note: string;
  /** CSS font-family values, written straight into the three face variables. */
  display: string;
  body: string;
  mono: string;
};

/**
 * The three faces already loaded by `next/font` are referenced through the
 * variables Next generates. The rest are system stacks, which cost nothing to
 * offer because they are already on the reader's machine.
 *
 * That is a deliberate limit: previewing an arbitrary Google font would mean
 * either loading it for every visitor or fetching from a CDN at runtime, and
 * §10 rules out the font-CDN request. If a pairing here is close but not
 * right, the fix is to swap the face in `app/layout.tsx` — one line — rather
 * than to widen this list.
 */
export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: 'instrument-plex',
    name: 'Instrument Serif · IBM Plex',
    note: 'The current pairing. Editorial serif for the name, technical sans for reading.',
    display: 'var(--font-display-face), Georgia, serif',
    body: 'var(--font-body-face), system-ui, sans-serif',
    mono: 'var(--font-mono-face), ui-monospace, monospace',
  },
  {
    id: 'plex-throughout',
    name: 'IBM Plex throughout',
    note: 'Drop the display serif entirely. More uniform, more engineering-document, less editorial.',
    display: 'var(--font-body-face), system-ui, sans-serif',
    body: 'var(--font-body-face), system-ui, sans-serif',
    mono: 'var(--font-mono-face), ui-monospace, monospace',
  },
  {
    id: 'serif-body',
    name: 'Instrument Serif · serif body',
    note: 'Serif for headings and body both. Slower and more considered to read; strongest for a writing-led site.',
    display: 'var(--font-display-face), Georgia, serif',
    body: 'Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif',
    mono: 'var(--font-mono-face), ui-monospace, monospace',
  },
  {
    id: 'system-native',
    name: 'System native',
    note: 'The reader’s own interface fonts. Zero font loading, so the fastest possible first paint — at the cost of looking like everything else on their machine.',
    display: 'Georgia, Times New Roman, serif',
    body: 'system-ui, -apple-system, Segoe UI, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  },
];

/* ------------------------------------------------------------------ scale */

export type TypeScale = {
  id: string;
  name: string;
  note: string;
  /** Multiplier applied to the root font size. */
  scale: number;
};

export const TYPE_SCALES: TypeScale[] = [
  { id: 'compact', name: 'Compact', note: 'More on screen, denser.', scale: 0.94 },
  { id: 'default', name: 'Default', note: 'As designed.', scale: 1 },
  { id: 'relaxed', name: 'Relaxed', note: 'Larger and airier; easier on a big screen.', scale: 1.06 },
];

/** localStorage key. Read by the boot script in `app/layout.tsx`. */
export const THEME_OVERRIDE_KEY = 'theme-overrides';

export type ThemeChoice = {
  paletteId: string;
  fontId: string;
  scaleId: string;
};

export const DEFAULT_CHOICE: ThemeChoice = {
  paletteId: 'ink-amber',
  fontId: 'instrument-plex',
  scaleId: 'default',
};
