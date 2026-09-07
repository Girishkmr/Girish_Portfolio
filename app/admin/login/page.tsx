import type { Metadata } from 'next';
import { LoginForm } from '@/components/admin/LoginForm';
import { isSupabaseConfigured } from '@/lib/supabase/config';

/**
 * FR-12. The only public admin route.
 *
 * No sign-up path exists anywhere in this app — Supabase Auth holds exactly one
 * account, created by hand in the dashboard. A magic link means there is no
 * password to leak, and nothing to brute-force.
 */
export const metadata: Metadata = {
  title: 'Sign in',
  // A login page has no business in search results.
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main id="main" className="flex-1">
      <div className="shell max-w-md py-24 lg:py-32">
        <p className="label mb-3">Admin</p>
        <h1 className="display text-3xl lg:text-4xl">Sign in</h1>

        {isSupabaseConfigured ? (
          <>
            <p className="mt-5 leading-relaxed text-ink-2">
              Enter the owner address and a one-time sign-in link will arrive by
              email.
            </p>
            <LoginForm next={next} />
          </>
        ) : (
          <p className="mt-5 leading-relaxed text-ink-2">
            Authentication is not configured on this deployment. Set{' '}
            <code className="rounded-sm border border-rule bg-surface-2 px-1.5 py-0.5 text-sm">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{' '}
            and{' '}
            <code className="rounded-sm border border-rule bg-surface-2 px-1.5 py-0.5 text-sm">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{' '}
            to enable it.
          </p>
        )}
      </div>
    </main>
  );
}
