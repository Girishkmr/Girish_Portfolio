/**
 * Whether Supabase credentials are present.
 *
 * This exists because Phase 2 was built before the Supabase project did, and
 * the production build has to stay green either way. Every read path checks
 * `isSupabaseConfigured` and degrades to an empty result rather than throwing,
 * so `npm run build` succeeds on a machine with no `.env.local` and the writing
 * routes render an honest "not configured yet" state instead of a stack trace.
 *
 * It is not a permanent crutch. Once the project exists and the variables are
 * set in Vercel, every one of these guards is simply always true.
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';
