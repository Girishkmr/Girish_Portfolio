import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

/**
 * Magic-link landing route.
 *
 * The link in the email carries a one-time `code`, which is exchanged here for
 * a session cookie. The exchange must happen server-side — that is the whole
 * point of the PKCE flow the SSR client uses.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  // An open redirect here would let a phishing link borrow this domain's
  // credibility, so only same-site absolute paths are honoured. `//evil.com`
  // is a protocol-relative URL, which is why the second test is not redundant.
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/admin';

  if (!isSupabaseConfigured || !code) {
    return NextResponse.redirect(`${origin}/admin/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth] code exchange failed:', error.message);
    return NextResponse.redirect(`${origin}/admin/login?error=link`);
  }

  return NextResponse.redirect(`${origin}${target}`);
}
