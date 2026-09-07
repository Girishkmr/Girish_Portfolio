import { NextResponse, type NextRequest } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';
import { isSupabaseConfigured } from '@/lib/supabase/config';

/**
 * Keeps the free Supabase project awake (REQUIREMENTS.html §12).
 *
 * Supabase Free **auto-pauses a project after one week of inactivity**. For a
 * personal site that means the writing feed and the gallery break for the first
 * visitor after a quiet week — and that visitor is disproportionately likely to
 * be someone who followed a link from a resume.
 *
 * The query is deliberately the cheapest thing that still counts as activity:
 * a `head` count against one table, which transfers no rows.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  /* Guarded so the endpoint cannot be used as a free database-ping service by
     anyone who finds the URL. Vercel Cron sends the secret as a bearer token;
     the query-string form is there for a manual curl while testing.

     If CRON_SECRET is unset the route refuses rather than running unguarded —
     failing closed is right for something that touches the database, and an
     unset secret is a misconfiguration, not a deployment without cron. */
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  }

  const authorised =
    request.headers.get('authorization') === `Bearer ${secret}` ||
    new URL(request.url).searchParams.get('secret') === secret;

  if (!authorised) {
    return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  }

  try {
    const supabase = createPublicClient();
    const { error } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('[keepalive] query failed:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (error) {
    console.error('[keepalive] threw:', error);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
