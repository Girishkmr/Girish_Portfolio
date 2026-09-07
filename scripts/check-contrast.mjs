/**
 * Fails if any palette in content/themes.ts breaks WCAG 2.2 AA.
 *
 * Colours chosen by eye are wrong roughly half the time — two of this
 * project's own original tokens failed and had to be replaced, which is why
 * this is a script rather than a review step.
 *
 *   node scripts/check-contrast.mjs
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../content/themes.ts', import.meta.url), 'utf8');

function lum(hex) {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  const c = (s) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const palettes = [];
const re = /id:\s*'([\w-]+)',\s*\n\s*name:\s*'([^']+)'/g;
let m;
while ((m = re.exec(src))) palettes.push({ id: m[1], name: m[2], at: m.index });

function tokensFor(startIndex, mode) {
  const slice = src.slice(startIndex);
  const modeAt = slice.indexOf(`${mode}: {`);
  if (modeAt === -1) return null;
  const block = slice.slice(modeAt, slice.indexOf('}', modeAt));
  const out = {};
  for (const mm of block.matchAll(/'?([\w-]+)'?:\s*'(#[0-9a-fA-F]{6})'/g)) out[mm[1]] = mm[2];
  return out;
}

const PAIRS = [
  ['ink', 'ground', 4.5, 'ink on ground'],
  ['ink-2', 'ground', 4.5, 'ink-2 on ground'],
  ['ink-3', 'ground', 4.5, 'ink-3 on ground'],
  ['accent', 'ground', 4.5, 'accent on ground'],
  ['accent-fg', 'accent', 4.5, 'accent-fg on accent'],
  ['ink', 'surface', 4.5, 'ink on surface'],
  ['ink-2', 'surface-2', 4.5, 'ink-2 on surface-2'],
];

let failures = 0;
let checked = 0;
for (const p of palettes) {
  for (const mode of ['light', 'dark']) {
    const t = tokensFor(p.at, mode);
    if (!t || !t.ground) continue;  // font pairings match the id/name regex too
    checked++;
    for (const [fg, bg, min, label] of PAIRS) {
      if (!t[fg] || !t[bg]) continue;
      const r = ratio(t[fg], t[bg]);
      if (r < min) {
        console.error(`FAIL  ${p.name} (${mode})  ${label}: ${r.toFixed(2)}:1 < ${min}  [${t[fg]} on ${t[bg]}]`);
        failures++;
      }
    }
  }
}

if (failures) {
  console.error(`\n${failures} contrast failure(s).`);
  process.exit(1);
}
console.log(`All palettes pass WCAG AA (${checked} palette/mode combinations checked).`);
