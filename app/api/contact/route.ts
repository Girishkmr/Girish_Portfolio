import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { contactSchema, fieldErrors } from '@/lib/contact-schema';
import { HONEYPOT_FIELD } from '@/lib/contact-fields';
import { rateLimit } from '@/lib/rate-limit';

/** node:crypto and the Supabase service client both need the Node runtime. */
export const runtime = 'nodejs';

/**
 * FR-07. The order of operations here is the whole design:
 *
 *   1. rate limit        — cheapest rejection first
 *   2. honeypot          — silently accepted, never explained to the sender
 *   3. schema            — the real gate; the browser's copy is only a courtesy
 *   4. STORE, then send  — the row is the durable record
 *
 * Step 4 is the important one. If Resend is down, or the domain is not yet
 * verified, or the mail lands in spam, the enquiry still exists in the
 * database. A form that only sends email loses messages invisibly, which is
 * the exact failure this endpoint was specified to prevent. So a mail failure
 * after a successful insert is logged and reported as success — from the
 * sender's side the message genuinely did get through.
 */

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** Stored hashed, not raw: enough to correlate a flood, not a stored identifier. */
function hashIp(ip: string): string {
  return createHash('sha256')
    .update(`${ip}:${process.env.NEXT_PUBLIC_SITE_URL ?? 'local'}`)
    .digest('hex')
    .slice(0, 32);
}

export async function POST(request: Request) {
  const ip = clientIp(request);

  const limit = rateLimit(ip);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many messages from this address. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const body = (payload ?? {}) as Record<string, unknown>;

  // Honeypot: answer 200, do nothing. Never tell it why.
  if (typeof body[HONEYPOT_FIELD] === 'string' && body[HONEYPOT_FIELD] !== '') {
    return NextResponse.json({ ok: true });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please check the form.', fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const { name, email, message } = parsed.data;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('[contact] Supabase is not configured; message dropped.');
    return NextResponse.json(
      { error: 'The contact form is not available right now.' },
      { status: 503 },
    );
  }

  // Created per request rather than at module scope: the service role key must
  // not be captured into a long-lived client that any later import can reach.
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: insertError } = await supabase.from('messages').insert({
    name,
    email,
    message,
    ip_hash: hashIp(ip),
    user_agent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
  });

  if (insertError) {
    console.error('[contact] insert failed:', insertError.message);
    return NextResponse.json(
      { error: 'Something went wrong saving your message. Please try again.' },
      { status: 500 },
    );
  }

  // --- notification, best effort -------------------------------------------
  const resendKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;

  if (resendKey && to) {
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        // Until a domain is verified with Resend, onboarding@resend.dev is the
        // only sender that works, and it can only deliver to the account owner.
        from: process.env.CONTACT_FROM_EMAIL ?? 'Portfolio <onboarding@resend.dev>',
        to: [to],
        replyTo: email,
        subject: `Portfolio enquiry — ${name}`,
        text: `${name} <${email}>\n\n${message}\n`,
      });
    } catch (error) {
      // Logged, not surfaced: the row is already saved, so nothing is lost.
      console.error('[contact] email delivery failed:', error);
    }
  } else {
    console.warn('[contact] RESEND_API_KEY or CONTACT_TO_EMAIL unset; stored only.');
  }

  return NextResponse.json({ ok: true });
}
