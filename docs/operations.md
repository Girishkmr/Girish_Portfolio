# Operations

How to read the dashboards, what each number means, and what to check first
when something breaks.

---

## Supabase dashboard

### Table Editor

Your data, as a spreadsheet. Fine for a glance; use the SQL Editor for anything
real.

> **Important:** the Table Editor runs as an admin, so **it bypasses RLS**. Rows
> visible here may be invisible to a visitor. Never use it to check whether your
> security policies work — see "Verifying RLS" below.

### SQL Editor

Where migrations are run. Paste the file, press Run.

Three queries worth keeping:

```sql
-- 1. Is RLS on everywhere? Every row must say true.
select tablename, rowsecurity from pg_tables where schemaname = 'public';

-- 2. What policies actually exist?
select tablename, policyname, roles, cmd, qual
from pg_policies where schemaname = 'public' order by tablename;

-- 3. How big is the database? (Free tier: 500 MB)
select pg_size_pretty(pg_database_size(current_database()));
```

### Authentication → Users

Should contain **exactly one** user. If a second appears, public sign-up got
re-enabled — the RLS policies assume a single owner, so this is a real problem,
not a curiosity.

Check the user is **confirmed**. An unconfirmed user cannot sign in, and the
magic link will appear to do nothing.

### Authentication → Sign In / Providers → Email

**Two toggles that look similar and are not:**

| Toggle | Wanted | Controls |
|---|---|---|
| **Enable Email provider** | **ON** | Whether email auth works *at all* |
| **Allow new users to sign up** | **OFF** | Whether new accounts can be created |

Turning the first one off disables **login**, not just registration — no email
is sent, and it looks exactly like a delivery problem. This has already caught
this project once ([`incidents.md`](./incidents.md) §7).

Confirm from the API rather than the UI:

```bash
curl "$SUPABASE_URL/auth/v1/settings" -H "apikey: $ANON_KEY"
# want: "email": true  and  "disable_signup": true
```

### Authentication → URL Configuration

**Site URL** — your production origin.
**Redirect URLs** — every origin you sign in from:

```
http://localhost:3000/**
https://girish-portfolio-ten.vercel.app/**
```

A missing entry here is the most common reason a magic link "silently doesn't
work": Supabase refuses the redirect and falls back to the Site URL, so you
land on the home page without a session.

### Storage

The `photos` bucket, **public**. Public means readable-by-URL; writes are still
governed by policies on `storage.objects`.

Free tier: **1 GB**. Photos are resized to ~200–500 KB before upload, so ~16
photos is around 5 MB. Not a near-term concern.

### Logs

**Auth Logs** — every sign-in attempt. First stop when login misbehaves.
**Postgres Logs** — query errors, including RLS rejections.
**API Logs** — every REST request, with status codes.

### Reports / Usage

Watch four numbers against the free tier:

| Metric | Limit | Realistic use |
|---|---|---|
| Database size | 500 MB | A few MB |
| Storage | 1 GB | ~5 MB |
| Egress | 5 GB/month | Low; `next/image` caches transforms on Vercel |
| Monthly active users | 50,000 | 1 |

> **The one that actually matters is none of these.** It's the **auto-pause
> after 7 days of inactivity** — which the keep-alive cron exists to prevent.

---

## Vercel dashboard

### Deployments

Every push builds. Each entry shows the commit, status and log.

**Production** is what `main` deploys to. **Preview** is every other branch, on
its own URL.

To roll back: open a previous successful deployment → **⋯** → **Promote to
Production**. Faster than reverting a commit when production is broken.

### Settings → Environment Variables

> **Read at build time.** Changing a value here does **nothing** to the running
> site until you redeploy. This has confused this project more than once.

| Variable | Scope |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | **Production only** |
| `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL` | All |
| `NEXT_PUBLIC_SITE_URL` | All — **no trailing slash** |
| `CRON_SECRET` | Production |

Keeping the service-role key out of Preview means a preview deploy cannot write
to the production `messages` table. The cost is that the contact form returns
503 on previews — which is the correct behaviour, not a bug.

### Settings → Deployment Protection

**Must be off** for a public portfolio. When on, every visitor is redirected to
a Vercel login — including recruiters. Symptom: `302` to `vercel.com/sso-api`.

### Cron Jobs

Lists what `vercel.json` schedules: `/api/cron/keepalive`, daily at 06:00 UTC.
Appears only after a deploy that includes `vercel.json`.

Test by hand:

```
https://<site>/api/cron/keepalive?secret=<CRON_SECRET>
```

| Response | Means |
|---|---|
| `{"ok":true,…}` | Working |
| `401 Unauthorised` | Secret set, but doesn't match |
| `503 not configured` | `CRON_SECRET` unset — the route **fails closed** |

### Logs (runtime)

Server-side `console.log` and `console.error` from route handlers and Server
Actions. Where `[contact] email delivery failed` would appear.

Hobby retains these briefly — check soon after an incident.

### Analytics / Speed Insights

Real Core Web Vitals from actual visitors, which is more honest than a
Lighthouse run on your own laptop. LCP under 2.5s and CLS under 0.1 are the
thresholds worth watching.

---

## Resend dashboard

**Emails** — everything sent, with delivery status. First stop when a contact
form row exists but no mail arrived.

**API Keys** — rotate here if a key is ever exposed.

**Domains** — until a domain is verified, `onboarding@resend.dev` **only
delivers to the Resend account owner's own address.** Not a bug; a Resend
restriction. It is also why buying a domain unblocks both the contact form and
auth email.

---

## Verifying RLS

The dashboard cannot answer this — it runs as admin. Ask the REST API as an
anonymous visitor.

```bash
URL=$(grep -m1 '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-)
ANON=$(grep -m1 '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2-)

# Published posts only — a draft must never appear
curl -s "$URL/rest/v1/posts?select=status,slug" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

# Todos must be empty
curl -s "$URL/rest/v1/todos?select=id" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

# Messages must be denied outright (401)
curl -s -w "\n%{http_code}\n" "$URL/rest/v1/messages?select=id" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
```

> **An empty result proves nothing if the table is empty.** Insert a real row
> via the service role first, *then* check that anonymous cannot see it.

Also worth re-running after any policy change: request a draft by its exact
slug in a private window. It must **404**, not render.

---

## When something breaks

Work down this list. Each step rules out a layer.

| Symptom | Check |
|---|---|
| Whole site down | Vercel → Deployments. Did the last build fail? Promote the previous one |
| Site redirects to a Vercel login | Deployment Protection is on |
| `/writing` or `/gallery` says "not connected" | Supabase env vars missing from the build — **redeploy** after adding them |
| Feed or gallery empty but site fine | Supabase paused (Reports → Usage), or the tables are genuinely empty |
| Images broken but page renders | `NEXT_PUBLIC_SUPABASE_URL` malformed — trailing slash produces `//storage`, which Vercel's optimiser rejects |
| Magic link never arrives | Email provider toggle first, then redirect allow-list, then Resend logs |
| Magic link errors on click | Callback URL not allow-listed |
| Signed in, saving fails | Migration not run, or RLS has no `authenticated` policy |
| **A draft is publicly readable** | **Stop.** RLS is off on `posts`. Fix before publishing anything real |
| Contact form 503s | `SUPABASE_SERVICE_ROLE_KEY` missing in that environment |
| Row saved, no email | Resend — key, or the `onboarding@resend.dev` recipient restriction |
| Site not indexed | `NEXT_PUBLIC_SITE_URL` unset → `robots.ts` emits `Disallow: /` |

---

## Routine maintenance

**Weekly** — confirm the cron ran (Vercel → Cron Jobs), and that the site loads.

**Monthly** — check Supabase usage against the free-tier limits, and skim
Vercel logs for repeated errors.

**Still outstanding:** backups. Supabase Free has none. A weekly `pg_dump` into
a private repo is the difference between "my writing" and "my writing, until
something goes wrong."
