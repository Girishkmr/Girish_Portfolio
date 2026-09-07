'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Magic-link sign-in (FR-12).
 *
 * The success message is deliberately identical whether or not the address
 * belongs to the owner account. Saying "no such user" would turn this form into
 * an oracle that confirms which address owns the site — and since exactly one
 * account exists, that is a meaningful thing to leak.
 *
 * `shouldCreateUser: false` is what makes that safe rather than merely quiet:
 * without it, Supabase would happily create an account for any address typed
 * here, and the single-owner assumption the RLS policies rest on would be
 * false within a day of the first spam bot finding the page.
 */
export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');

    try {
      const supabase = createClient();
      const redirectTo = new URL('/auth/callback', window.location.origin);
      if (next) redirectTo.searchParams.set('next', next);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: redirectTo.toString(),
        },
      });

      // Even a genuine error is reported as sent, for the reason above. A real
      // fault still reaches the console for whoever is debugging it.
      if (error) console.error('[login]', error.message);
      setState('sent');
    } catch (error) {
      console.error('[login]', error);
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <p className="mt-8 rounded-sm border border-rule bg-surface-2 p-4 leading-relaxed text-ink-2">
        If that address owns this site, a sign-in link is on its way. It expires
        shortly, so use it soon.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-sm border border-rule bg-surface px-3 py-2.5 text-ink outline-none focus-visible:border-ink-3"
        />
      </div>

      <button
        type="submit"
        disabled={state === 'sending'}
        className="self-start rounded-sm bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {state === 'sending' ? 'Sending…' : 'Send sign-in link'}
      </button>

      {state === 'error' ? (
        <p role="alert" className="text-sm text-ink-2">
          Could not reach the auth service. Try again in a moment.
        </p>
      ) : null}
    </form>
  );
}
