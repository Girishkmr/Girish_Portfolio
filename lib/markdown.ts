import 'server-only';

import { codeToHtml } from 'shiki';

/**
 * Markdown support for the writing platform.
 *
 * Post bodies are Markdown in Postgres, not MDX files in the repo — see
 * REQUIREMENTS.html §2. That means rendering happens at request time on the
 * server, and the one expensive part is syntax highlighting.
 *
 * Shiki runs the real TextMate grammars, which is why its output looks like an
 * editor rather than like regex guesswork. It is also why it cannot run inside
 * react-markdown: highlighting is async and react-markdown's pipeline is not.
 * So code blocks are highlighted up front, keyed by their own source text, and
 * the renderer looks them up. `server-only` above makes the boundary a compile
 * error rather than a convention — Shiki's grammars are megabytes and must
 * never reach the browser.
 */

/** Matches fenced code blocks, capturing the info string and the body. */
const FENCE = /^```([\w+-]*)[^\n]*\n([\s\S]*?)^```/gm;

export type HighlightedCode = Map<string, string>;

/**
 * Pre-render every fenced code block to HTML.
 *
 * Keyed by the trimmed code text, so the renderer can find a block again
 * without threading positions through react-markdown. Two identical blocks in
 * one post collapse to one entry, which is correct — they highlight the same.
 */
export async function highlightCodeBlocks(markdown: string): Promise<HighlightedCode> {
  const out: HighlightedCode = new Map();

  const blocks = [...markdown.matchAll(FENCE)].map((m) => ({
    lang: (m[1] || 'text').toLowerCase(),
    code: m[2].replace(/\n$/, ''),
  }));

  await Promise.all(
    blocks.map(async ({ lang, code }) => {
      const key = code.trim();
      if (out.has(key)) return;

      try {
        out.set(
          key,
          await codeToHtml(code, {
            lang,
            // Dual themes emit --shiki-dark custom properties alongside the
            // light colours, so one render serves both themes and the theme
            // toggle needs no re-highlight. The swap lives in globals.css.
            themes: { light: 'github-light', dark: 'github-dark' },
          }),
        );
      } catch {
        // Unknown language, which is a content mistake and not worth a 500.
        // Falling through leaves no entry, and the renderer emits a plain
        // <pre> instead.
      }
    }),
  );

  return out;
}

/**
 * Reading time in minutes.
 *
 * 200 wpm is the usual prose figure. Code is stripped first — nobody reads a
 * config block at prose speed, and counting it inflates a short post with a
 * long snippet into a claimed ten-minute read.
 */
export function readingMinutes(markdown: string): number {
  const prose = markdown
    .replace(FENCE, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~\-]/g, ' ');

  const words = prose.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * First real sentence or two, for the feed card and the meta description.
 *
 * Strips headings, code and link syntax first, so an essay that opens with a
 * title or an image does not produce an excerpt made of punctuation.
 */
export function excerptFrom(markdown: string, maxChars = 200): string {
  const plain = markdown
    .replace(FENCE, ' ')
    .replace(/^#{1,6}\s+.*$/gm, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxChars) return plain;

  // Cut on a word boundary rather than mid-word.
  const cut = plain.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxChars).trimEnd()}…`;
}

/** URL-safe slug, matching the `slug_is_url_safe` check in 0002_posts.sql. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}
