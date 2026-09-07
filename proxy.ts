import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/supabase/config';

/**
 * Session refresh plus the /admin guard.
 *
 * This file is `proxy.ts`, not `middleware.ts`. Next 16 deprecated and renamed
 * the convention; REQUIREMENTS.html §8 still says middleware.ts because it was
 * written against Next 15 conventions. The framework wins.
 *
 * Two jobs, in order:
 *
 *  1. Refresh the auth token. Server Components cannot write cookies, so if
 *     nothing refreshed the session here it would expire mid-browse and the
 *     admin area would start bouncing to login for no visible reason.
 *
 *  2. Guard /admin. This is defence in depth, NOT the security boundary — the
 *     real boundary is RLS in the database (0002_posts.sql). A proxy check
 *     alone would be bypassed by anything that reaches the data another way,
 *     which is exactly the mistake that makes these apps leak.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

  // Without credentials there is no session to refresh and no way to log in.
  // Send admin traffic to the login page, which explains the situation.
  if (!isSupabaseConfigured) {
    if (isAdminRoute && request.nextUrl.pathname !== '/admin/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser(), not getSession(): this call validates the token with the auth
  // server. getSession() trusts whatever is in the cookie, which is precisely
  // the thing an attacker controls.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminRoute && !user && request.nextUrl.pathname !== '/admin/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    // So login can send them back where they were going.
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Already signed in and staring at the login page: skip it.
  if (user && request.nextUrl.pathname === '/admin/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  /**
   * Everything except static assets and image files. The negative lookahead is
   * the pattern Supabase's own SSR guide uses; matching every request would
   * refresh the session on each favicon fetch.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)',
  ],
};
