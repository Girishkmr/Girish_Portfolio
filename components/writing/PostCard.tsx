import Link from 'next/link';
import type { PostRow } from '@/types/database';
import { postHref, postTitle } from '@/lib/posts';
import { PostBody } from '@/components/writing/PostBody';

/**
 * One row in the feed.
 *
 * The two post types render differently on purpose (REQUIREMENTS.html §2):
 *
 *  - A **note** renders inline, at full length. It is short by definition, and
 *    making a reader click through to three sentences is a worse experience
 *    than just showing them.
 *  - An **essay** renders as a card with an excerpt and a link. Its body is
 *    long, has its own page, its own URL and its own OG image.
 *
 * That is the entire justification for the `type` discriminator existing.
 */
export function PostCard({ post }: { post: PostRow }) {
  const href = postHref(post);
  const date = post.published_at ?? post.created_at;

  return (
    <article className="border-t border-rule py-10 first:border-t-0 first:pt-0">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <time dateTime={date} className="label tabular-nums">
          {new Date(date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </time>

        <span className="label text-ink-3">
          {post.type === 'essay' ? 'Essay' : 'Note'}
        </span>

        {post.type === 'essay' && post.reading_min ? (
          <span className="label text-ink-3">{post.reading_min} min read</span>
        ) : null}
      </div>

      {post.type === 'essay' && href ? (
        <>
          <h3 className="display text-2xl lg:text-3xl">
            <Link href={href} className="transition-opacity hover:opacity-70">
              {postTitle(post)}
            </Link>
          </h3>

          {post.excerpt ? (
            <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-2">{post.excerpt}</p>
          ) : null}

          <p className="mt-4">
            <Link href={href} className="label text-accent hover:underline">
              Read the essay
              {/* The visible text repeats across cards; the title disambiguates
                  it for anyone navigating by link list. */}
              <span className="sr-only">: {postTitle(post)}</span>
            </Link>
          </p>
        </>
      ) : (
        /* Notes have no title of their own — the date above is the heading. */
        <PostBody markdown={post.body_md} />
      )}

      {post.tags.length > 0 ? (
        <ul className="mt-5 flex flex-wrap gap-2">
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
    </article>
  );
}
