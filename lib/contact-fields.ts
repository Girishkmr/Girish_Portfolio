/**
 * The contact form's shape, with NO validation library attached.
 *
 * This module exists purely so the browser bundle can name these fields
 * without pulling Zod in behind them. Zod is ~54KB of JavaScript that the
 * server needs and the client does not: importing the schema into the form
 * component shipped the whole library to every visitor to save one round trip
 * on a form most of them will never submit. The server schema in
 * `contact-schema.ts` remains the only authority on what is valid.
 */

export type ContactInput = {
  name: string;
  email: string;
  message: string;
};

export type ContactFieldErrors = Partial<Record<keyof ContactInput, string>>;

/**
 * Honeypot field name. Deliberately NOT part of the schema: a filled honeypot
 * is answered with a 200 and silently dropped, not with a validation error. A
 * bot that learns which field betrayed it just comes back without that field.
 */
export const HONEYPOT_FIELD = 'company';

/**
 * The messages the form shows. Shared so the client's courtesy check and the
 * server's real one word the same failure identically.
 */
export const CONTACT_MESSAGES = {
  name: 'Please enter your name.',
  nameLong: 'That name is too long.',
  email: 'Please enter a valid email address.',
  message: 'Please write at least 20 characters, so I can reply usefully.',
  messageLong: 'Please keep it under 4000 characters.',
} as const;
