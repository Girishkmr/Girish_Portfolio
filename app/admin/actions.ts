'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { excerptFrom, readingMinutes, slugify } from '@/lib/markdown';
import type { PostStatus, PostType } from '@/types/database';

/**
 * Write paths for the admin surface (FR-13).
 *
 * Every action re-checks the session with `getCurrentUser()`. That looks
 * redundant next to the guard in proxy.ts, and it is not: a Server Action is a
 * callable POST endpoint that anyone can invoke directly with its action id.
 * The proxy protects page navigations, not the action itself. RLS is the third
 * layer, and the only one that holds if both of these were somehow bypassed.
 */

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

function parseTags(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(',')
        .map((tag) => tag.trim().toLowerCase().replace(/^#/, ''))
        .filter(Boolean),
    ),
  ].slice(0, 12);
}

export async function savePost(formData: FormData): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const id = String(formData.get('id') ?? '').trim();
  const type = String(formData.get('type') ?? 'note') as PostType;
  const status = String(formData.get('status') ?? 'draft') as PostStatus;
  const title = String(formData.get('title') ?? '').trim();
  const bodyMd = String(formData.get('body_md') ?? '').trim();
  const tags = parseTags(String(formData.get('tags') ?? ''));

  if (type !== 'note' && type !== 'essay') return { ok: false, error: 'Unknown type.' };
  if (status !== 'draft' && status !== 'published') {
    return { ok: false, error: 'Unknown status.' };
  }
  if (!bodyMd) return { ok: false, error: 'A post needs a body.' };
  if (type === 'essay' && !title) return { ok: false, error: 'An essay needs a title.' };

  // Mirrors the essays_are_addressable constraint in 0002_posts.sql. Checking
  // here produces a readable message; the constraint is what guarantees it.
  const slug = type === 'essay' ? slugify(title) : null;
  if (type === 'essay' && !slug) {
    return { ok: false, error: 'That title produces an empty slug.' };
  }

  const supabase = await createClient();

  const payload = {
    type,
    status,
    title: title || null,
    slug,
    body_md: bodyMd,
    excerpt: excerptFrom(bodyMd),
    tags,
    reading_min: type === 'essay' ? readingMinutes(bodyMd) : null,
    // Set once, on first publish, and never moved afterwards — re-publishing an
    // edited post must not jump it back to the top of the feed and the RSS.
    ...(status === 'published' ? { published_at: new Date().toISOString() } : {}),
  };

  if (id) {
    const { data: existing } = await supabase
      .from('posts')
      .select('published_at')
      .eq('id', id)
      .maybeSingle();

    if (existing?.published_at) {
      payload.published_at = existing.published_at;
    }

    const { error } = await supabase.from('posts').update(payload).eq('id', id);
    if (error) return { ok: false, error: error.message };

    revalidateWriting(slug);
    return { ok: true, id };
  }

  const { data, error } = await supabase
    .from('posts')
    .insert(payload)
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  revalidateWriting(slug);
  return { ok: true, id: data.id };
}

export async function deletePost(id: string): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const supabase = await createClient();
  const { error } = await supabase.from('posts').delete().eq('id', id);

  if (error) return { ok: false, error: error.message };

  revalidateWriting(null);
  return { ok: true, id };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

/**
 * On-demand revalidation (REQUIREMENTS.html §6), so a publish is live at once
 * rather than up to 60 seconds later. The sitemap and RSS carry the same
 * content and would otherwise lag behind the page a reader was just sent.
 */
function revalidateWriting(slug: string | null) {
  revalidatePath('/writing');
  revalidatePath('/writing/rss.xml');
  revalidatePath('/sitemap.xml');
  if (slug) revalidatePath(`/writing/${slug}`);
}
