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

/**
 * Trailing slashes are stripped, and this is not cosmetic.
 *
 * Every consumer builds paths by concatenation — `${supabaseUrl}/storage/...`
 * — so a stored value ending in `/` yields `host//storage/...`. Supabase's own
 * API happily serves that, which is exactly what makes it dangerous: the
 * breakage surfaces somewhere else entirely. Vercel's image optimiser rejects
 * the doubled path with a 400 because it no longer matches the `remotePatterns`
 * rule in next.config.ts, so the gallery renders `<img>` tags that all fail
 * while every direct request to Storage succeeds.
 *
 * Normalising here rather than trusting whoever typed the environment variable
 * means the value cannot be wrong in a way that only shows up in production.
 * `lib/site.ts` does the same thing to NEXT_PUBLIC_SITE_URL for the same reason.
 */
export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(
  /\/+$/,
  '',
);

export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';
