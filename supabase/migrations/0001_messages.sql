-- Contact-form submissions (FR-07, FR-16).
--
-- Why this table exists at all: email delivery is the part of a contact form
-- that fails silently. A message that lands in spam, or that Resend drops
-- because a domain is not yet verified, is an enquiry lost with no trace. The
-- row is the durable copy; the email is the notification.
--
-- Run this in the Supabase SQL editor, or via `supabase db push`.

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  name        text not null check (char_length(name) between 2 and 100),
  email       text not null check (char_length(email) <= 200),
  message     text not null check (char_length(message) between 20 and 4000),

  -- Operational context, kept for spam triage. Not rendered anywhere public.
  ip_hash     text,
  user_agent  text,

  -- FR-16: the inbox marks an enquiry handled once it has been answered.
  handled     boolean not null default false
);

create index if not exists messages_created_at_idx
  on public.messages (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Deny by default. No policy is created for anon or authenticated, so neither
-- can read or write this table at all — not even the owner's browser session.
--
-- Inserts happen ONLY through the /api/contact route handler, which uses the
-- service role key. That key bypasses RLS, never leaves the server, and is
-- never prefixed NEXT_PUBLIC_. This is deliberate: an anon-insertable table is
-- an open spam endpoint, and rate limiting in front of a route is enforceable
-- in a way an anon insert policy is not.
--
-- The Phase 3 message inbox will read through a server route under the same
-- key, guarded by an authenticated session.
-- ---------------------------------------------------------------------------

alter table public.messages enable row level security;

-- Belt and braces: revoke the API roles' table grants as well, so a future
-- permissive policy cannot on its own open the table up.
revoke all on public.messages from anon, authenticated;
