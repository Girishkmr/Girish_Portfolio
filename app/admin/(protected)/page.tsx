import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { postTitle } from '@/lib/posts';
import type { PostRow } from '@/types/database';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

/**
 * Every post, drafts included.
 *
 * This is the one place drafts are visible, and it works because the request
 * carries an authenticated session: the "owner writes" policy in
 * 0002_posts.sql grants `for all` to `authenticated`, so the same query that
 * returns published rows only for a visitor returns everything here. No
 * service-role key, no second client, no bypass.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('updated_at', { ascending: false });

  const posts: PostRow[] = data ?? [];
  const drafts = posts.filter((post) => post.status === 'draft');
  const published = posts.filter((post) => post.status === 'published');

  return (
    <div className="shell py-16">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="label mb-3">Admin</p>
          <h1 className="display text-3xl lg:text-4xl">Posts</h1>
        </div>
        <Link
          href="/admin/posts"
          className="rounded-sm bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
        >
          New post
        </Link>
      </div>

      {error ? (
        <p role="alert" className="mt-8 leading-relaxed text-ink-2">
          Could not load posts: {error.message}
        </p>
      ) : null}

      <p className="label mt-10">
        {published.length} published · {drafts.length} draft
        {drafts.length === 1 ? '' : 's'}
      </p>

      {posts.length === 0 ? (
        <p className="mt-8 leading-relaxed text-ink-2">
          Nothing here yet. Write the first one.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col">
          {posts.map((post) => (
            <li key={post.id} className="border-t border-rule py-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link
                  href={`/admin/posts/${post.id}`}
                  className="font-medium text-ink hover:underline"
                >
                  {postTitle(post)}
                </Link>
                <span className="label text-ink-3">{post.type}</span>
                <span
                  className={`label ${
                    post.status === 'published' ? 'text-accent' : 'text-ink-3'
                  }`}
                >
                  {post.status}
                </span>
                <time
                  dateTime={post.updated_at}
                  className="label ml-auto tabular-nums text-ink-3"
                >
                  {new Date(post.updated_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
