'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  DEFAULT_CHOICE,
  FONT_PAIRINGS,
  PALETTES,
  THEME_OVERRIDE_KEY,
  TYPE_SCALES,
  type ThemeChoice,
} from '@/content/themes';
import {
  applyThemeChoice,
  clearThemeChoice,
  exportPaletteCss,
} from '@/lib/apply-theme';
import { contrastRatio, formatRatio, passes } from '@/lib/contrast';

/**
 * The theme lab.
 *
 * Its purpose is judgement, not configuration. You cannot tell whether a
 * palette works from swatches — only from real content at real sizes, with
 * your actual name at the top and your actual paragraphs underneath. So this
 * applies the choice to the **whole site**, persisted in localStorage, and you
 * go and browse it.
 *
 * Three things it deliberately does not do:
 *
 * **It does not save to the database.** The home page is static and must never
 * gain a data dependency — that is the reason a paused Supabase project cannot
 * take the CV down. A colour scheme is not worth surrendering it.
 *
 * **It does not affect visitors.** Overrides live in one browser. Shipping a
 * theme means pasting the exported CSS into `globals.css`, which is a commit,
 * a review and a deploy — the appropriate weight for changing how the site
 * looks to everyone.
 *
 * **It does not let you pick arbitrary colours.** Every palette offered here
 * has passed `scripts/check-contrast.mjs`. Freehand colour pickers are how a
 * site quietly loses its accessibility score; the ratios are shown below so
 * the constraint is visible rather than merely enforced.
 */
/** `storage` fires only in other tabs, which is the only case worth reacting to. */
function subscribeToStorage(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

function parseStoredChoice(raw: string | null): ThemeChoice | null {
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as { choice?: Partial<ThemeChoice> };
    return stored.choice?.paletteId
      ? { ...DEFAULT_CHOICE, ...(stored.choice as ThemeChoice) }
      : null;
  } catch {
    return null;
  }
}

export function ThemeLab() {
  const [copied, setCopied] = useState(false);

  /* The controls have to start out matching whatever the boot script already
     painted. Reading that with useSyncExternalStore rather than an effect
     keeps it derived — an effect calling setState here would be a cascading
     render, and would briefly show the default selection over a page already
     wearing a different theme.

     getSnapshot must return a stable value or this loops; a string from
     localStorage compares by value, so parsing happens outside it. */
  const stored = useSyncExternalStore(
    subscribeToStorage,
    useCallback(() => {
      try {
        return localStorage.getItem(THEME_OVERRIDE_KEY);
      } catch {
        return null;
      }
    }, []),
    () => null, // server render: no storage, and null keeps hydration identical
  );

  /* Null until something is picked in this session, so the stored value shows
     through. Once picked, this wins — localStorage does not emit an event in
     the tab that wrote it. */
  const [picked, setPicked] = useState<ThemeChoice | null>(null);
  const choice = picked ?? parseStoredChoice(stored) ?? DEFAULT_CHOICE;

  function update(next: Partial<ThemeChoice>) {
    const merged = { ...choice, ...next };
    setPicked(merged);

    const override = applyThemeChoice(merged);
    try {
      localStorage.setItem(
        THEME_OVERRIDE_KEY,
        JSON.stringify({ ...override, choice: merged }),
      );
    } catch {
      /* private mode — the preview still works for this session */
    }
  }

  function reset() {
    // Explicitly set rather than cleared: removing the key does not fire a
    // storage event in this tab, so `stored` would still hold the old value.
    setPicked(DEFAULT_CHOICE);
    clearThemeChoice();
    try {
      localStorage.removeItem(THEME_OVERRIDE_KEY);
    } catch {
      /* nothing to clear */
    }
  }

  async function copyCss() {
    try {
      await navigator.clipboard.writeText(exportPaletteCss(choice));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const palette = PALETTES.find((p) => p.id === choice.paletteId) ?? PALETTES[0];

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h2 className="label mb-4 border-t border-rule pt-4">Palette</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PALETTES.map((option) => {
            const active = option.id === choice.paletteId;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => update({ paletteId: option.id })}
                aria-pressed={active}
                className={`flex flex-col gap-3 rounded-sm border p-4 text-left transition-colors ${
                  active ? 'border-ink-3' : 'border-rule hover:border-ink-3'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">{option.name}</span>
                  {active ? <span className="label text-accent">Active</span> : null}
                </div>

                {/* Swatches drawn from the palette's own values, not from the
                    live tokens — so every card shows itself, not the theme
                    currently applied. */}
                <div className="flex gap-1.5">
                  {(['ground', 'surface-2', 'ink-3', 'ink', 'accent'] as const).map((token) => (
                    <span
                      key={token}
                      title={`${token} · ${option.light[token]}`}
                      className="size-7 rounded-sm border border-rule"
                      style={{ background: option.light[token] }}
                    />
                  ))}
                  <span aria-hidden className="mx-1 w-px bg-rule" />
                  {(['ground', 'surface-2', 'ink-3', 'ink', 'accent'] as const).map((token) => (
                    <span
                      key={token}
                      title={`${token} · ${option.dark[token]}`}
                      className="size-7 rounded-sm border border-rule"
                      style={{ background: option.dark[token] }}
                    />
                  ))}
                </div>

                <span className="text-sm leading-relaxed text-ink-3">{option.note}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="label mb-4 border-t border-rule pt-4">Type</h2>
        <div className="flex flex-col gap-3">
          {FONT_PAIRINGS.map((option) => {
            const active = option.id === choice.fontId;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => update({ fontId: option.id })}
                aria-pressed={active}
                className={`rounded-sm border p-4 text-left transition-colors ${
                  active ? 'border-ink-3' : 'border-rule hover:border-ink-3'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="text-2xl text-ink"
                    style={{ fontFamily: option.display }}
                  >
                    Girish Kumar
                  </span>
                  {active ? <span className="label text-accent">Active</span> : null}
                </div>
                <p className="mt-2 text-sm text-ink-2" style={{ fontFamily: option.body }}>
                  I build the RAG and LLM tooling layer, and the infrastructure it runs on.
                </p>
                <p className="label mt-2">{option.name}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-3">{option.note}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="label mb-4 border-t border-rule pt-4">Scale</h2>
        <div className="flex flex-wrap gap-2">
          {TYPE_SCALES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => update({ scaleId: option.id })}
              aria-pressed={option.id === choice.scaleId}
              title={option.note}
              className={`label rounded-sm border px-3 py-1.5 transition-colors ${
                option.id === choice.scaleId
                  ? 'border-ink-3 text-ink'
                  : 'border-rule hover:border-ink-3 hover:text-ink'
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>
      </section>

      <ContrastReport palette={palette} />

      <section>
        <h2 className="label mb-4 border-t border-rule pt-4">Then what</h2>
        <p className="max-w-[62ch] leading-relaxed text-ink-2">
          This preview lives in <strong>this browser only</strong> — visitors
          still see the committed theme. Go and look at{' '}
          <Link href="/" className="text-accent hover:underline">
            the home page
          </Link>
          ,{' '}
          <Link href="/writing" className="text-accent hover:underline">
            writing
          </Link>{' '}
          and{' '}
          <Link href="/gallery" className="text-accent hover:underline">
            the gallery
          </Link>{' '}
          before deciding. A palette that looks good on swatches often falls
          apart over a wall of real text.
        </p>
        <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-2">
          When you have picked one, copy the CSS and it gets pasted into{' '}
          <code className="rounded-sm border border-rule bg-surface-2 px-1.5 py-0.5 text-sm">
            app/globals.css
          </code>{' '}
          — or just tell me which one and I will make the change.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={copyCss}
            className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
          >
            {copied ? 'Copied' : 'Copy CSS'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="label rounded-sm border border-rule px-3 py-2 hover:border-ink-3 hover:text-ink"
          >
            Reset to committed theme
          </button>
        </div>
      </section>
    </div>
  );
}

/**
 * Live contrast readout for the selected palette.
 *
 * Everything offered here already passes, so this will not normally show a
 * failure. It is here because the constraint should be *visible* — the numbers
 * are what stop "I prefer the lighter grey" from quietly costing the site its
 * accessibility score, and two of this project's original tokens failed
 * exactly that way before anyone measured them.
 */
function ContrastReport({ palette }: { palette: (typeof PALETTES)[number] }) {
  const PAIRS = [
    ['ink', 'ground', 'Body heading on background'],
    ['ink-2', 'ground', 'Body text on background'],
    ['ink-3', 'ground', 'Muted labels on background'],
    ['accent', 'ground', 'Accent text and links'],
    ['accent-fg', 'accent', 'Text inside an accent button'],
  ] as const;

  return (
    <section>
      <h2 className="label mb-4 border-t border-rule pt-4">
        Contrast — {palette.name}
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-rule text-left">
              <th className="label py-2 font-normal">Pair</th>
              <th className="label py-2 font-normal">Light</th>
              <th className="label py-2 font-normal">Dark</th>
            </tr>
          </thead>
          <tbody>
            {PAIRS.map(([fg, bg, label]) => {
              const light = contrastRatio(palette.light[fg], palette.light[bg]);
              const dark = contrastRatio(palette.dark[fg], palette.dark[bg]);
              return (
                <tr key={label} className="border-b border-rule last:border-b-0">
                  <td className="py-2 text-ink-2">{label}</td>
                  <td className={`py-2 tabular-nums ${passes(light) ? 'text-ink-2' : 'text-accent'}`}>
                    {formatRatio(light)} {passes(light) ? '' : '· FAILS'}
                  </td>
                  <td className={`py-2 tabular-nums ${passes(dark) ? 'text-ink-2' : 'text-accent'}`}>
                    {formatRatio(dark)} {passes(dark) ? '' : '· FAILS'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-3">
        WCAG 2.2 AA wants 4.5:1 for normal text. Every palette offered here
        clears it in both themes — verified by{' '}
        <code className="rounded-sm border border-rule bg-surface-2 px-1 py-0.5">
          scripts/check-contrast.mjs
        </code>
        , which is what keeps the accessibility score at 100.
      </p>
    </section>
  );
}
