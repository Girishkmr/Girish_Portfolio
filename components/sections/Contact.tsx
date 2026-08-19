'use client';

import { useId, useState } from 'react';
import {
  CONTACT_MESSAGES,
  HONEYPOT_FIELD,
  type ContactFieldErrors,
  type ContactInput,
} from '@/lib/contact-fields';
import { socials } from '@/content/resume';
import { Section } from '@/components/ui/Section';

/**
 * FR-07. Three fields, no address.
 *
 * There is no mailto and no phone number anywhere on this page (decision L-6):
 * an address on an indexed page is scraped within days, and the form covers
 * the same need without publishing anything.
 */

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * The client's courtesy check. Three rules, hand-written, so the browser does
 * not download a validation library to run them — see lib/contact-fields.ts.
 * The route handler re-validates with the real schema regardless, and its
 * per-field errors overwrite whatever this decided.
 */
function checkLocally(input: ContactInput): ContactFieldErrors {
  const errors: ContactFieldErrors = {};

  if (input.name.length < 2) errors.name = CONTACT_MESSAGES.name;
  else if (input.name.length > 100) errors.name = CONTACT_MESSAGES.nameLong;

  // Deliberately permissive. The address is confirmed by a reply landing in
  // it, not by a regex; over-strict patterns reject valid addresses.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email = CONTACT_MESSAGES.email;

  if (input.message.length < 20) errors.message = CONTACT_MESSAGES.message;
  else if (input.message.length > 4000) errors.message = CONTACT_MESSAGES.messageLong;

  return errors;
}

/** Underlined rather than boxed — the same hairline vocabulary as the sections. */
const fieldClass =
  'w-full border-b border-rule bg-transparent py-2.5 text-ink outline-none transition-colors placeholder:text-ink-3/70 focus:border-ink-3 aria-[invalid=true]:border-ink';

export function Contact() {
  const formId = useId();
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // SyntheticEvent, not FormEvent: React 19's types deprecate FormEvent as a
  // thing that "doesn't actually exist".
  async function onSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);

    const candidate: ContactInput = {
      name: String(data.get('name') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      message: String(data.get('message') ?? '').trim(),
    };

    const localErrors = checkLocally(candidate);
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setFormError(null);
      setStatus('error');
      return;
    }

    setErrors({});
    setFormError(null);
    setStatus('sending');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...candidate,
          [HONEYPOT_FIELD]: String(data.get(HONEYPOT_FIELD) ?? ''),
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        fields?: ContactFieldErrors;
      };

      if (!response.ok) {
        if (result.fields) setErrors(result.fields);
        setFormError(result.error ?? 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }

      form.reset();
      setStatus('sent');
    } catch {
      setFormError('Could not reach the server. Please check your connection.');
      setStatus('error');
    }
  }

  return (
    <Section id="contact" eyebrow="Get in touch" title="Contact">
      <div className="grid gap-12 lg:grid-cols-[1fr_14rem] lg:gap-16">
        <form onSubmit={onSubmit} noValidate className="flex max-w-xl flex-col gap-7">
          <div>
            <label htmlFor={`${formId}-name`} className="label mb-1 block">
              Name
            </label>
            <input
              id={`${formId}-name`}
              name="name"
              type="text"
              autoComplete="name"
              required
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? `${formId}-name-error` : undefined}
              className={fieldClass}
            />
            {errors.name && (
              <p id={`${formId}-name-error`} className="mt-2 text-sm text-ink">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${formId}-email`} className="label mb-1 block">
              Email
            </label>
            <input
              id={`${formId}-email`}
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? `${formId}-email-error` : undefined}
              className={fieldClass}
            />
            {errors.email && (
              <p id={`${formId}-email-error`} className="mt-2 text-sm text-ink">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${formId}-message`} className="label mb-1 block">
              Message
            </label>
            <textarea
              id={`${formId}-message`}
              name="message"
              rows={5}
              required
              aria-invalid={errors.message ? true : undefined}
              aria-describedby={errors.message ? `${formId}-message-error` : undefined}
              className={`${fieldClass} resize-y`}
            />
            {errors.message && (
              <p id={`${formId}-message-error`} className="mt-2 text-sm text-ink">
                {errors.message}
              </p>
            )}
          </div>

          {/* Honeypot. Hidden from people and from assistive technology alike;
              a bot filling every input is the only thing that finds it. */}
          <div aria-hidden className="absolute left-[-9999px] h-px w-px overflow-hidden">
            <label htmlFor={`${formId}-company`}>Company</label>
            <input
              id={`${formId}-company`}
              name={HONEYPOT_FIELD}
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={status === 'sending'}
              className="rounded-sm bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending…' : 'Send message'}
            </button>

            <p role="status" aria-live="polite" className="text-sm text-ink-2">
              {status === 'sent' && 'Thank you — your message is with me. I will reply by email.'}
              {status === 'error' && formError}
            </p>
          </div>
        </form>

        <div className="flex flex-col gap-4 border-t border-rule pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <p className="label">Elsewhere</p>
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm text-ink-2 transition-colors hover:text-ink"
            >
              {s.label} <span className="font-mono text-xs text-ink-3">/{s.handle}</span>
            </a>
          ))}
        </div>
      </div>
    </Section>
  );
}
