'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { setHandled } from '@/app/admin/inbox-actions';
import type { MessageRow } from '@/types/database';

/**
 * One enquiry.
 *
 * The message body is rendered as plain text in a `<p>`, never as HTML and
 * never through a Markdown renderer. It is the one string on this site written
 * by a stranger, and the inbox is viewed while signed in — exactly the
 * combination that makes stored XSS worth something to an attacker. React
 * escapes it by default; the rule is simply not to reach for
 * `dangerouslySetInnerHTML` here, however convenient formatting might look.
 *
 * `mailto:` is safe and useful: the address is only ever seen by the owner, so
 * L-6's no-public-address rule is not in play.
 */
export function MessageItem({ message }: { message: MessageRow }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticHandled, setOptimisticHandled] = useOptimistic(message.handled);

  function toggle() {
    setError(null);
    startTransition(async () => {
      setOptimisticHandled(!optimisticHandled);
      const result = await setHandled(message.id, !optimisticHandled);
      if (!result.ok) setError(result.error ?? 'Could not update.');
    });
  }

  return (
    <li
      className={`border-b border-rule py-5 ${optimisticHandled ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-medium text-ink">{message.name}</p>
        <a
          href={`mailto:${message.email}?subject=${encodeURIComponent('Re: your message')}`}
          className="text-sm text-accent hover:underline"
        >
          {message.email}
        </a>
        <time
          dateTime={message.created_at}
          className="label ml-auto tabular-nums text-ink-3"
        >
          {new Date(message.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </time>
      </div>

      <p className="mt-3 max-w-[70ch] whitespace-pre-wrap leading-relaxed text-ink-2">
        {message.message}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className="label rounded-sm border border-rule px-2.5 py-1 hover:border-ink-3 hover:text-ink disabled:opacity-40"
        >
          {optimisticHandled ? 'Mark unhandled' : 'Mark handled'}
        </button>

        {error ? (
          <span role="alert" className="text-sm text-ink-3">
            {error}
          </span>
        ) : null}
      </div>
    </li>
  );
}
