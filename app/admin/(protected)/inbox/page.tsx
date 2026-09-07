import type { Metadata } from 'next';
import { getMessages } from '@/app/admin/inbox-actions';
import { MessageItem } from '@/components/admin/MessageItem';

export const metadata: Metadata = {
  title: 'Inbox',
  robots: { index: false, follow: false },
};

/**
 * FR-16. Contact submissions.
 *
 * This page is the reason the contact endpoint stores before it sends: email
 * is the part of a contact form that fails silently, and a row here means an
 * enquiry is never lost to a spam folder or an unverified sending domain.
 */
export default async function InboxPage() {
  const result = await getMessages();

  if (!result.ok) {
    return (
      <div className="shell max-w-3xl py-16">
        <p className="label mb-3">Admin</p>
        <h1 className="display mb-8 text-3xl lg:text-4xl">Inbox</h1>
        <p role="alert" className="leading-relaxed text-ink-2">
          {result.error}
        </p>
      </div>
    );
  }

  const { messages } = result;
  const unhandled = messages.filter((message) => !message.handled);

  return (
    <div className="shell max-w-3xl py-16">
      <p className="label mb-3">Admin</p>
      <h1 className="display text-3xl lg:text-4xl">Inbox</h1>
      <p className="label mt-4 tabular-nums">
        {messages.length} total · {unhandled.length} unhandled
      </p>

      {messages.length === 0 ? (
        <p className="mt-10 border-t border-rule pt-8 leading-relaxed text-ink-2">
          No messages yet.
        </p>
      ) : (
        <ul className="mt-10 flex flex-col">
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
        </ul>
      )}
    </div>
  );
}
