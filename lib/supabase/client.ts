'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { supabaseAnonKey, supabaseUrl } from './config';

/**
 * Supabase client for Client Components.
 *
 * Only the login form needs this — it calls `signInWithOtp` to send the magic
 * link. Everything else reads on the server, where the data never has to cross
 * the network twice and the query is not visible in the browser's devtools.
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
