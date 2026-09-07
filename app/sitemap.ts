import type { MetadataRoute } from 'next';
import { getPublishedPosts } from '@/lib/posts';
import { absoluteUrl } from '@/lib/site';

/**
 * FR-11. Sitemap.
 *
 * Only essays appear. Notes render inline in the feed and have no page of
 * their own, so listing them would submit URLs that do not exist — the fastest
 * way to lose a crawler's trust in the rest of the file.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const essays = await getPublishedPosts({ type: 'essay' });

  return [
    {
      url: absoluteUrl('/'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: absoluteUrl('/writing'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...essays
      .filter((post) => post.slug)
      .map((post) => ({
        url: absoluteUrl(`/writing/${post.slug}`),
        lastModified: new Date(post.updated_at),
        changeFrequency: 'yearly' as const,
        priority: 0.6,
      })),
  ];
}
