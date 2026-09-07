import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedPosts, getTagCounts } from '@/lib/posts';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { PostCard } from '@/components/writing/PostCard';
import { FeedFilters } from '@/components/writing/FeedFilters';
import type { PostType } from '@/types/database';

/**
 * FR-08. The merged feed.
 *
 * ISR with a 60-second window (REQUIREMENTS.html §6): a new post is live within
 * a minute without a rebuild, and a burst of readers costs one query rather
 * than one query each. The home page stays static and database-free, so a
 * paused free-tier project can never take the CV surface down with it.
 */
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Writing',
  description:
    'Notes and essays on data engineering, applied AI, and the infrastructure underneath both.',
};

export default async function WritingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; tag?: string }>;
}) {
  const params = await searchParams;

  // Anything else in ?type= is ignored rather than trusted into a query.
  const type: PostType | undefined =
    params.type === 'note' || params.type === 'essay' ? params.type : undefined;
  const tag = params.tag?.trim() || undefined;

  const [posts, tags] = await Promise.all([
    getPublishedPosts({ type, tag }),
    getTagCounts(),
  ]);

  return (
    <main id="main" className="flex-1">
      <div className="shell py-20 lg:py-28">
        <header className="mb-10">
          <p className="label mb-3">Writing</p>
          <h1 className="display text-4xl lg:text-5xl">Notes &amp; essays</h1>
          <p className="mt-5 max-w-[60ch] leading-relaxed text-ink-2">
            Short notes as they occur to me, longer essays when something is
            worth working out properly. Mostly data engineering, applied AI, and
            the infrastructure underneath both.
          </p>
        </header>

        <FeedFilters activeType={type} activeTag={tag} tags={tags} />

        {posts.length > 0 ? (
          <div className="mt-12 flex flex-col">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyState filtered={Boolean(type || tag)} />
        )}
      </div>
    </main>
  );
}

/**
 * Three different empty states, because they mean three different things and
 * a single "nothing here" would be unhelpful in all three.
 */
function EmptyState({ filtered }: { filtered: boolean }) {
  if (!isSupabaseConfigured) {
    return (
      <div className="mt-12 border-t border-rule pt-8">
        <p className="max-w-[58ch] leading-relaxed text-ink-2">
          The writing feed is not connected yet — this deployment has no database
          credentials configured. Everything else on the site is unaffected.
        </p>
      </div>
    );
  }

  if (filtered) {
    return (
      <div className="mt-12 border-t border-rule pt-8">
        <p className="leading-relaxed text-ink-2">
          Nothing matches that filter yet.{' '}
          <Link href="/writing" className="text-accent hover:underline">
            Show everything
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mt-12 border-t border-rule pt-8">
      <p className="leading-relaxed text-ink-2">No posts published yet.</p>
    </div>
  );
}
