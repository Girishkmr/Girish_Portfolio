import 'server-only';

import { createPublicClient } from '@/lib/supabase/public';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { PostRow, PostType } from '@/types/database';

/**
 * Every read the public writing surface performs.
 *
 * Two rules hold throughout:
 *
 *  1. **Never throw.** A portfolio whose home page 500s because the free-tier
 *     database auto-paused is worse than one whose feed is briefly empty. Each
 *     function returns an empty result and logs, so a Supabase outage costs the
 *     writing section and nothing else.
 *
 *  2. **Filter on status anyway.** RLS already hides drafts from the anon key,
 *     so `.eq('status', 'published')` is redundant — which is exactly why it is
 *     here. If a future policy is loosened by accident, these queries must not
 *     silently start serving drafts on the strength of one line in a migration.
 */

const FEED_COLUMNS =
  'id,type,status,slug,title,body_md,excerpt,cover_path,tags,reading_min,published_at,created_at,updated_at';

export type FeedFilters = {
  type?: PostType;
  tag?: string;
};

export async function getPublishedPosts(filters: FeedFilters = {}): Promise<PostRow[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const supabase = createPublicClient();

    let query = supabase
      .from('posts')
      .select(FEED_COLUMNS)
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (filters.type) query = query.eq('type', filters.type);
    if (filters.tag) query = query.contains('tags', [filters.tag]);

    const { data, error } = await query;

    if (error) {
      console.error('[posts] feed query failed:', error.message);
      return [];
    }

    return data ?? [];
  } catch (error) {
    console.error('[posts] feed query threw:', error);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<PostRow | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from('posts')
      .select(FEED_COLUMNS)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (error) {
      console.error('[posts] slug query failed:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[posts] slug query threw:', error);
    return null;
  }
}

/**
 * Every tag in use, with a count, most-used first.
 *
 * Computed in JS over the published set rather than in SQL. At portfolio scale
 * that is a few hundred rows at worst, and it avoids a database function that
 * would need its own migration and its own RLS reasoning.
 */
export async function getTagCounts(): Promise<{ tag: string; count: number }[]> {
  const posts = await getPublishedPosts();
  const counts = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Adjacent published essays, for prev/next on an essay page (FR-09). */
export async function getEssayNeighbours(slug: string) {
  const essays = await getPublishedPosts({ type: 'essay' });
  const index = essays.findIndex((post) => post.slug === slug);

  if (index === -1) return { previous: null, next: null };

  // The feed is newest-first, so the NEXT essay chronologically sits at a
  // lower index. Naming them by time rather than by array position keeps the
  // page's "older / newer" links from silently inverting.
  return {
    next: essays[index - 1] ?? null,
    previous: essays[index + 1] ?? null,
  };
}

/** Titles for a post that may legitimately have none (notes). */
export function postTitle(post: PostRow): string {
  if (post.title) return post.title;

  const date = post.published_at ?? post.created_at;
  return `Note — ${new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;
}

/** The canonical path for a post. Notes live in the feed and have no page. */
export function postHref(post: PostRow): string | null {
  return post.type === 'essay' && post.slug ? `/writing/${post.slug}` : null;
}
