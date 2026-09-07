import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './config';

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Uses the ANON key, so Row-Level Security is doing the access control — see
 * supabase/migrations/0002_posts.sql. That is deliberate: a Server Component
 * holding the service-role key would bypass RLS on every read, and the first
 * `select('*')` that forgot a status filter would serve drafts to the public.
 *
 * `cookies()` is async in this version of Next, and in a Server Component the
 * cookie store is read-only — writes throw. Supabase's SSR helper wants to
 * write refreshed tokens back, so the setAll below swallows that specific
 * failure. It is safe because `proxy.ts` refreshes the session on every request
 * before any of this runs; the write here is a duplicate, not the only chance.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Read-only store: a Server Component render. proxy.ts already
          // refreshed the session, so there is nothing to recover here.
        }
      },
    },
  });
}

/**
 * The current session's user, or null.
 *
 * Uses `getUser()` rather than `getSession()` on purpose. `getSession()` reads
 * the JWT straight out of the cookie and does not verify it, so it will happily
 * report a user for a forged or expired token. `getUser()` asks the auth server
 * to validate it. Anything guarding access must use this one.
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) return null;
  return data.user;
}
