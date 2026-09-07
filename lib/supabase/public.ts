import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { supabaseAnonKey, supabaseUrl } from './config';

/**
 * A cookie-free Supabase client for PUBLIC reads.
 *
 * Why this exists, separately from `server.ts`:
 *
 * `server.ts` builds a cookie-aware client so it can carry the owner's session.
 * Reading `cookies()` marks the surrounding route as dynamic — Next cannot
 * pre-render something whose output may vary per request. `/writing/[slug]` has
 * `generateStaticParams` and a `revalidate` window, so it is meant to be
 * statically rendered and cached. Those two facts contradict each other, and
 * the route 500s with "Page changed from static to dynamic at runtime".
 *
 * The resolution is not to give up ISR. It is to notice that a published post
 * is the same for every visitor: the read needs no session, so it should not be
 * asking for one. This client sends only the anon key, touches no cookies, and
 * leaves the route free to be cached.
 *
 * Security is unchanged. This is still the anon key, so the RLS policies in
 * 0002_posts.sql apply exactly as before — drafts remain invisible. Anything
 * that must see unpublished rows uses the cookie-aware client in `server.ts`
 * and gets them through the owner's session.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // No session to persist and none to refresh: this client is anonymous by
      // construction, and saying so keeps it from touching any storage.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
