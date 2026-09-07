'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/supabase/server';
import type { MessageRow } from '@/types/database';

/**
 * FR-16. The message inbox.
 *
 * This is the one place in the app that reads through the service-role key on
 * a page path, and it needs justifying rather than assuming:
 *
 * `messages` has RLS enabled and **no policy at all** for `anon` or
 * `authenticated`, plus an explicit `revoke all` (0001_messages.sql). That is
 * deliberate — an anon-insertable table is an open spam endpoint, and the
 * contact route enforces rate limiting in front of the write. The consequence
 * is that no session, not even the owner's, can read the table.
 *
 * So the inbox reads with the service key, which bypasses RLS. **The session
 * check below is therefore the entire access control** — there is no database
 * policy underneath it to catch a mistake. Every function here checks first
 * and returns before touching the admin client. Do not add a code path that
 * reverses that order.
 *
 * The alternative — granting `authenticated` a read policy — was rejected
 * because it widens the table's exposure permanently to save one guard clause.
 */

export type InboxResult =
  | { ok: true; messages: MessageRow[] }
  | { ok: false; error: string };

export async function getMessages(): Promise<InboxResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { ok: false, error: error.message };
    return { ok: true, messages: data ?? [] };
  } catch (error) {
    console.error('[inbox] read failed:', error);
    return { ok: false, error: 'The inbox is not available.' };
  }
}

export async function setHandled(
  id: string,
  handled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('messages').update({ handled }).eq('id', id);

    if (error) return { ok: false, error: error.message };

    revalidatePath('/admin/inbox');
    return { ok: true };
  } catch (error) {
    console.error('[inbox] update failed:', error);
    return { ok: false, error: 'Could not update the message.' };
  }
}
