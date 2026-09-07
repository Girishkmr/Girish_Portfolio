import { getPublishedPosts, postTitle } from '@/lib/posts';
import { identity } from '@/content/resume';
import { absoluteUrl } from '@/lib/site';

/**
 * FR-11. RSS.
 *
 * Both types ship. A notes-only reader can filter on the site, but a feed that
 * silently omits half the writing is a feed that quietly lies to the people who
 * subscribed to it — and subscribers are the readers least likely to notice
 * they are missing something.
 *
 * Notes carry their Markdown source as the description rather than rendered
 * HTML: Shiki's output is styled with CSS custom properties this project owns,
 * and it would arrive in a reader with no stylesheet and no theme.
 */
export const revalidate = 600;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const posts = await getPublishedPosts();
  const feedUrl = absoluteUrl('/writing/rss.xml');

  const items = posts
    .map((post) => {
      // Notes have no page, so the item links to the feed. Anchoring on the id
      // means a reader clicking through lands on the right region of the page.
      const link =
        post.type === 'essay' && post.slug
          ? absoluteUrl(`/writing/${post.slug}`)
          : `${absoluteUrl('/writing')}#${post.id}`;

      const description = post.excerpt ?? post.body_md.slice(0, 500);
      const pubDate = new Date(post.published_at ?? post.created_at).toUTCString();

      return `    <item>
      <title>${escapeXml(postTitle(post))}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(post.id)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description)}</description>
${post.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`).join('\n')}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(identity.name)} — Writing</title>
    <link>${escapeXml(absoluteUrl('/writing'))}</link>
    <description>Notes and essays on data engineering, applied AI, and the infrastructure underneath both.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400',
    },
  });
}
