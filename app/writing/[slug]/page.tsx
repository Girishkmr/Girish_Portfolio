import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEssayNeighbours, getPostBySlug, getPublishedPosts, postTitle } from '@/lib/posts';
import { PostBody } from '@/components/writing/PostBody';

/**
 * FR-09. One essay.
 *
 * ISR, same 60-second window as the feed. `generateStaticParams` pre-renders
 * the essays that exist at build time; anything published afterwards is
 * rendered on first request and then cached, which is what makes publishing
 * from a phone feel immediate without a deploy.
 */
export const revalidate = 60;

export async function generateStaticParams() {
  const essays = await getPublishedPosts({ type: 'essay' });
  return essays
    .filter((post) => post.slug)
    .map((post) => ({ slug: post.slug as string }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) return { title: 'Not found' };

  const title = postTitle(post);
  const description = post.excerpt ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.published_at ?? undefined,
      tags: post.tags,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function EssayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  // getPostBySlug filters on status, so an unpublished draft is a 404 here
  // rather than a private page with a guessable URL.
  if (!post) notFound();

  const { previous, next } = await getEssayNeighbours(slug);
  const date = post.published_at ?? post.created_at;

  return (
    <main id="main" className="flex-1">
      <article className="shell py-20 lg:py-28">
        <header className="mb-12 max-w-[62ch]">
          <p className="mb-5">
            <Link href="/writing" className="label hover:text-ink">
              ← All writing
            </Link>
          </p>

          <h1 className="display text-4xl leading-tight lg:text-5xl">
            {postTitle(post)}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <time dateTime={date} className="label tabular-nums">
              {new Date(date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </time>
            {post.reading_min ? (
              <span className="label text-ink-3">{post.reading_min} min read</span>
            ) : null}
          </div>
        </header>

        <PostBody markdown={post.body_md} />

        {post.tags.length > 0 ? (
          <ul className="mt-12 flex flex-wrap gap-2 border-t border-rule pt-8">
            {post.tags.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/writing?tag=${encodeURIComponent(tag)}`}
                  className="label rounded-sm border border-rule px-2 py-1 transition-colors hover:border-ink-3 hover:text-ink"
                >
                  #{tag}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {previous || next ? (
          <nav
            aria-label="More essays"
            className="mt-12 grid gap-6 border-t border-rule pt-8 sm:grid-cols-2"
          >
            {previous ? (
              <Link href={`/writing/${previous.slug}`} className="group">
                <span className="label">Older</span>
                <span className="mt-2 block text-ink-2 transition-colors group-hover:text-ink">
                  {postTitle(previous)}
                </span>
              </Link>
            ) : (
              <span />
            )}

            {next ? (
              <Link href={`/writing/${next.slug}`} className="group sm:text-right">
                <span className="label">Newer</span>
                <span className="mt-2 block text-ink-2 transition-colors group-hover:text-ink">
                  {postTitle(next)}
                </span>
              </Link>
            ) : null}
          </nav>
        ) : null}
      </article>
    </main>
  );
}
