import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PostEditor } from '@/components/admin/PostEditor';
import type { PostRow } from '@/types/database';

export const metadata: Metadata = {
  title: 'Editor',
  robots: { index: false, follow: false },
};

/**
 * FR-13. One editor for both new and existing posts.
 *
 * The optional catch-all means /admin/posts creates and /admin/posts/<id>
 * edits, with no second component that drifts from the first. The alternative —
 * a `new/` page and an `[id]/` page — is two forms to keep in step, and they
 * never stay in step.
 */
export default async function EditorPage({
  params,
}: {
  params: Promise<{ id?: string[] }>;
}) {
  const { id } = await params;
  const postId = id?.[0];

  if (!postId) return <PostEditor post={null} />;

  const supabase = await createClient();
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .maybeSingle();

  if (!data) notFound();

  return <PostEditor post={data as PostRow} />;
}
