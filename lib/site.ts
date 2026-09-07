/**
 * The site's absolute origin.
 *
 * Sitemap entries, RSS links and canonical URLs all have to be absolute, and a
 * relative fallback would silently emit `undefined/writing` into a feed that
 * readers subscribe to. Kept in one place so layout, sitemap, robots and RSS
 * cannot disagree about what this site is called.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');

export function absoluteUrl(path: string): string {
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
