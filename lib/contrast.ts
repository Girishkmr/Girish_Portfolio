/**
 * WCAG 2.2 contrast maths.
 *
 * This exists because the theme lab lets you pick colours freely, and picking
 * freely is exactly how a site loses its accessibility score. Two values
 * originally drafted for this project's own palette failed AA and had to be
 * replaced — the note is still in `globals.css` so nobody "restores" them.
 *
 * Rather than trust taste, the lab computes every pair and refuses to call a
 * palette good until the numbers say so.
 *
 * Pure functions, no DOM — usable on the server or in the browser.
 */

export type Rgb = { r: number; g: number; b: number };

/** Accepts `#abc`, `#aabbcc`. Returns null on anything else. */
export function parseHex(hex: string): Rgb | null {
  const value = hex.trim().replace(/^#/, '');

  if (value.length === 3) {
    const [r, g, b] = value.split('');
    return parseHex(`#${r}${r}${g}${g}${b}${b}`);
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

/**
 * Relative luminance, per the WCAG definition.
 *
 * The channel values are gamma-corrected before weighting: sRGB is not linear,
 * so averaging raw bytes would badly misjudge how bright a colour looks. The
 * weights (0.2126 / 0.7152 / 0.0722) reflect that human vision is far more
 * sensitive to green than to blue.
 */
export function luminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio between two hex colours: 1 (identical) to 21 (black/white). */
export function contrastRatio(a: string, b: string): number | null {
  const rgbA = parseHex(a);
  const rgbB = parseHex(b);
  if (!rgbA || !rgbB) return null;

  const lumA = luminance(rgbA);
  const lumB = luminance(rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * The thresholds that matter here.
 *
 * 4.5:1 is AA for normal text — the bar this site holds itself to.
 * 3:1 is AA for large text (24px+, or 19px+ bold) and for non-text graphics
 * such as the run-strip bars, which carry meaning through colour but are not
 * read as words.
 */
export type ContrastTarget = 'text' | 'large' | 'graphic';

export const THRESHOLD: Record<ContrastTarget, number> = {
  text: 4.5,
  large: 3,
  graphic: 3,
};

export function passes(ratio: number | null, target: ContrastTarget = 'text'): boolean {
  return ratio !== null && ratio >= THRESHOLD[target];
}

/** `7.53:1` — formatted the way the WCAG tooling and the CSS comments do. */
export function formatRatio(ratio: number | null): string {
  return ratio === null ? '—' : `${ratio.toFixed(2)}:1`;
}
