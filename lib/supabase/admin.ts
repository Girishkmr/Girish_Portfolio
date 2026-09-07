import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { supabaseUrl } from './config';

/**
 * Service-role client. **Bypasses RLS entirely.**
 *
 * This exists for exactly one legitimate pattern: the `messages` table denies
 * both `anon` and `authenticated` outright (0001_messages.sql), so there is no
 * session that can read it. The contact endpoint writes through this key, and
 * the FR-16 inbox reads through it — both behind their own guard.
 *
 * Rules for using it, which are not negotiable:
 *
 *  1. **Never** in a Client Component, and never in a module a client
 *     component can import. `server-only` above makes that a build error.
 *  2. **Never** without an authorisation check of your own first. RLS is not
 *     protecting you here; you are. Every caller must have established that
 *     the request is the owner's before it reaches this client.
 *  3. Prefer the session-carrying client in `server.ts` wherever it works.
 *     Reach for this only when a table has deliberately no policy at all.
 *
 * Created per call rather than at module scope, so the key is not captured in
 * a long-lived object that any later import could reach.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || !supabaseUrl) {
    throw new Error('Service role key is not configured.');
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
