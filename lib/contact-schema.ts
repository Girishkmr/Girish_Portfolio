import { z } from 'zod';
import { CONTACT_MESSAGES, type ContactFieldErrors, type ContactInput } from './contact-fields';

/**
 * The authoritative validation for FR-07. SERVER ONLY — see contact-fields.ts
 * for why the browser gets a hand-rolled copy of the same three rules instead
 * of this module.
 *
 * Client-side validation is a courtesy to the person filling the form, never a
 * security control: anyone can POST straight at the endpoint, so this is the
 * gate that actually matters.
 */
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, CONTACT_MESSAGES.name)
    .max(100, CONTACT_MESSAGES.nameLong),
  email: z.email(CONTACT_MESSAGES.email).max(200),
  message: z
    .string()
    .trim()
    .min(20, CONTACT_MESSAGES.message)
    .max(4000, CONTACT_MESSAGES.messageLong),
});

/** Flattens a ZodError into one message per field, which is what the form renders. */
export function fieldErrors(error: z.ZodError<ContactInput>): ContactFieldErrors {
  const out: ContactFieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path[0] as keyof ContactInput | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }

  return out;
}
