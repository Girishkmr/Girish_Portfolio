import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { signOut } from '@/app/admin/actions';

/**
 * The auth guard for every admin page except login.
 *
 * `(protected)` is a route group, so it adds nothing to the URL — /admin and
 * /admin/posts still live where they look like they live. The group exists
 * purely so this layout can wrap the protected pages without also wrapping
 * /admin/login, which would redirect the login page to itself forever.
 *
 * This is the second of three layers. proxy.ts turns unauthenticated
 * navigations away before they render; this catches anything that reaches a
 * page some other way; RLS in Postgres is what actually protects the rows.
 */
export const dynamic = 'force-dynamic';

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-rule">
        <div className="shell flex flex-wrap items-center justify-between gap-4 py-4">
          <nav aria-label="Admin" className="flex items-center gap-5">
            <Link href="/admin" className="label text-ink">
              Dashboard
            </Link>
            <Link href="/admin/posts" className="label hover:text-ink">
              New post
            </Link>
            <Link href="/admin/photos" className="label hover:text-ink">
              Photos
            </Link>
            <Link href="/admin/todos" className="label hover:text-ink">
              Todos
            </Link>
            <Link href="/admin/inbox" className="label hover:text-ink">
              Inbox
            </Link>
            <Link href="/writing" className="label hover:text-ink">
              View site
            </Link>
          </nav>

          <form action={signOut}>
            <button type="submit" className="label hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
