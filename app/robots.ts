import type { MetadataRoute } from 'next';
import { absoluteUrl, siteUrl } from '@/lib/site';

/**
 * FR-11. robots.txt.
 *
 * /admin is disallowed as housekeeping, not as protection — the real guard is
 * the auth check in proxy.ts plus RLS in the database. robots.txt is a request,
 * and anything that ignores it is exactly the thing you were worried about.
 *
 * A preview deployment must not be indexed: two copies of the same content
 * competing in search results is the one SEO mistake a portfolio can make that
 * actively costs it traffic.
 */
export default function robots(): MetadataRoute.Robots {
  const isProduction =
    process.env.VERCEL_ENV === 'production' || !siteUrl.includes('localhost');

  if (!isProduction) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/admin/'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
