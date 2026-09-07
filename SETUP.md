# Switching the backend on

Steps 1–3 (create project, run migrations, verify RLS) are done. This picks up
at step 4 and runs to a working, deployed site with auth and a contact form.

Nothing here changes code. It is all dashboard configuration.

> **On UI labels.** Supabase moves things between releases, and this was written
> in September 2026. Where a label has drifted, the section says what the thing
> *is* so you can find it under whatever it is now called. If a screen looks
> nothing like the description, search the dashboard for the key name itself.

---

## 4. Get the three Supabase values

Dashboard → your project → **Project Settings** (gear icon, bottom of the left
sidebar) → **API**. On newer projects this is split into **API** and
**API Keys**; check both.

You need three things.

### 4a. Project URL

Under **Project URL** / **Data API**. Looks like:

```
https://abcdefghijklmnop.supabase.co
```

That goes in `NEXT_PUBLIC_SUPABASE_URL`.

### 4b. The public key

This is the key that is *designed* to ship in the browser. Supabase has
renamed it, so you will see one of two things:

| What you see | Use it |
|---|---|
| **`anon` / `public`** — a long JWT starting `eyJ...` | yes |
| **Publishable key** — starts `sb_publishable_...` | yes |

Either works with this codebase. If both are shown, prefer the publishable key;
the `anon` JWT is the legacy form and Supabase is phasing it out.

Goes in `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

> It is safe in the browser. That is not carelessness — it is the design. The
> Row-Level Security policies in `supabase/migrations/0002_posts.sql` are what
> protect the data, and they assume this key is public.

### 4c. The secret key

The one that **bypasses RLS entirely**. Again, two possible names:

| What you see | Use it |
|---|---|
| **`service_role`** — a long JWT, usually behind a "Reveal" button | yes |
| **Secret key** — starts `sb_secret_...`, shown **once** on creation | yes |

Goes in `SUPABASE_SERVICE_ROLE_KEY`.

> **This one is a credential.** Never prefix it `NEXT_PUBLIC_`, never import it
> into a Client Component, never paste it into a chat or an issue. It is used in
> exactly one file — `app/api/contact/route.ts` — because the `messages` table
> denies everything to both `anon` and `authenticated` by design, so the contact
> endpoint is the only thing that may write to it.
>
> If a secret key is ever exposed, revoke it in this same screen and issue a new
> one. Rotating it is cheap; leaving it is not.

---

## 5. Create the one user, and close the door behind you

**Authentication** → **Users** → **Add user** → **Create new user**.

- Email: the address you want to sign in with.
- Password: required by the form. Set something long and forget it — you will
  sign in by magic link, so it is never used.
- Tick **Auto Confirm User** if offered. Without it the account sits
  unconfirmed and the magic link will not sign you in.

Then turn off public sign-ups.

**Authentication** → **Sign In / Providers** → **Email**. This panel has **two
separate toggles**, and they do very different things:

| Toggle | Set it to | What it controls |
|---|---|---|
| **Enable Email provider** | **ON** | Whether email auth works *at all* — magic links, password sign-in, password resets |
| **Allow new users to sign up** | **OFF** | Whether a *new* account can be created |

> **Do not confuse these.** Turning off *Enable Email provider* does not merely
> close registration — it disables **login**, so no magic link is ever sent and
> nothing arrives in your inbox. The symptom looks exactly like an email
> delivery problem, which sends you hunting through spam folders and SMTP
> settings for a switch in the dashboard.
>
> Confirm which one you hit by asking the API directly:
>
> ```bash
> curl "$SUPABASE_URL/auth/v1/settings" -H "apikey: $ANON_KEY"
> ```
>
> You want `"email": true` under `external`, and `"disable_signup": true` at
> the top level. If a sign-in attempt returns
> `422 email_provider_disabled`, the master toggle is off.

> Why both. `components/admin/LoginForm.tsx` passes `shouldCreateUser: false`,
> so the form itself will not create accounts. The dashboard toggle is the
> actual guarantee — it closes the API too. The RLS policy in `0002_posts.sql`
> grants full write access to *any* authenticated user, because the design
> assumes exactly one account exists. That assumption has to be enforced here.

---

## 5a. Point auth email at Resend (recommended)

Supabase's built-in email sender is a **shared testing service with a low
hourly cap** — a handful of messages per hour across the whole project, and no
deliverability guarantee. It is documented as not for production. The failure
mode is nasty: sign-in works while you are setting things up, then silently
stops the week you actually need it, and looks identical to a bug.

You already have a Resend account for the contact form, and Resend speaks SMTP,
so the fix is configuration rather than another service.

**Authentication** → **Emails** → **SMTP Settings** → enable custom SMTP:

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` (the literal word) |
| Password | your `RESEND_API_KEY` — the same `re_…` value |
| Sender email | `onboarding@resend.dev`, until a domain is verified |
| Sender name | `Girish Kumar` |

> The same restriction applies as for the contact form: until you verify a
> domain with Resend, `onboarding@resend.dev` **only delivers to the Resend
> account owner's own address**. That is fine here — you are the only person
> who ever receives a sign-in link. Once D-1 lands and a domain is verified,
> change the sender to an address at that domain.

Supabase also caps auth emails independently under **Authentication → Rate
Limits** ("Rate limit for sending emails"). Raise it if you hit it while
testing; the default is deliberately small.

---

## 6. Allow-list the callback URL

**Authentication** → **URL Configuration**.

- **Site URL** — your production origin, e.g. `https://girishkumar.dev`
  (or the `.vercel.app` URL until a domain is bought — decision D-1).
- **Redirect URLs** — add every origin you will sign in from:

```
http://localhost:3000/**
https://your-domain.com/**
https://your-project.vercel.app/**
```

> The magic link's `emailRedirectTo` is built from `window.location.origin` at
> the moment you submit the form. If that origin is not on this list, Supabase
> refuses the redirect and the link lands on an error page instead of signing
> you in. This is the single most common reason magic-link auth "silently
> doesn't work".

---

## 7. Local `.env.local`

In the project root:

```bash
cp .env.local.example .env.local
```

Fill it in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...        # or the anon JWT
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...                 # or the service_role JWT

RESEND_API_KEY=                                         # step 9
CONTACT_FROM_EMAIL=Portfolio <onboarding@resend.dev>
CONTACT_TO_EMAIL=

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.env.local` is gitignored. Confirm before you commit anything:

```bash
git status --short          # .env.local must NOT appear
```

Then:

```bash
npm run dev
```

Visit `http://localhost:3000/admin/login`, enter your address, and check your
inbox. The link signs you in and drops you at `/admin`.

---

## 8. Regenerate the row types

`types/database.ts` is hand-written — it had to be, because the schema did not
exist when the code was. Now it does, so replace it with the real thing:

```bash
npx supabase login                              # opens a browser
npx supabase link --project-ref abcdefghijklmnop
npx supabase gen types typescript --linked > types/database.ts
npx tsc --noEmit                                # must stay clean
```

The project ref is the subdomain from your Project URL.

> If `tsc` complains after regenerating, the generated types are right and
> something in the code assumed wrongly — fix the code, not the generated file.
> It is overwritten on every regeneration.

---

## 9. Resend, for contact-form email

1. Sign up at [resend.com](https://resend.com) with the address that should
   *receive* enquiries.
2. **API Keys** → **Create API Key**. Sending permission is enough. Copy it —
   it is shown once.
3. `RESEND_API_KEY=re_...`
4. `CONTACT_TO_EMAIL=` the address you just signed up with.

> **Until you verify a domain, `onboarding@resend.dev` can only deliver to the
> Resend account owner's own address.** That is a Resend restriction, not a bug.
> It is fine here — you are the only recipient. Once a domain exists (D-1), add
> it under **Domains**, complete the DNS records, and change
> `CONTACT_FROM_EMAIL` to an address at that domain.

Remember the contact endpoint **stores the message before it sends the email**
and treats a mail failure as success. So if the row appears in `messages` but no
email arrives, Resend is the problem and nothing has been lost.

---

## 10. Vercel

### If the project is not on Vercel yet

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** →
   pick `Girish_Portfolio`.
2. Framework preset: **Next.js** (detected automatically).
3. Do **not** deploy yet — add the environment variables first, or the first
   build ships a site with no backend.

### Environment variables

Vercel project → **Settings** → **Environment Variables**.

Add each of these. Tick **Production**, **Preview** and **Development** for all
of them unless noted:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the public key |
| `SUPABASE_SERVICE_ROLE_KEY` | the secret key — **Production only** |
| `RESEND_API_KEY` | `re_...` |
| `CONTACT_FROM_EMAIL` | `Portfolio <onboarding@resend.dev>` |
| `CONTACT_TO_EMAIL` | your inbox |
| `NEXT_PUBLIC_SITE_URL` | your production origin, **no trailing slash** |

> **`NEXT_PUBLIC_SITE_URL` is not cosmetic.** `app/robots.ts` treats a
> localhost-looking origin as non-production and emits `Disallow: /`. Leave this
> unset and your live site tells every crawler not to index it. It also feeds
> the sitemap, the RSS `<link>` elements and every canonical URL.

> Keeping the secret key out of Preview means a preview deploy cannot write to
> the production `messages` table. The trade is that the contact form does not
> work on previews — it returns 503, which is the correct thing for it to do.

### Deploy

Environment variables are read **at build time**. Adding them to an existing
project does nothing until you rebuild:

**Deployments** → most recent → **⋯** → **Redeploy**.

---

## 11. Verify, in this order

Each of these fails in a different place, so do them one at a time.

```bash
# 1. Local build is clean with real credentials present
npm run build && npx tsc --noEmit && npm run lint
```

Then on the deployed site:

1. **`/`** loads. (It never depended on the database — if this breaks,
   something unrelated is wrong.)
2. **`/robots.txt`** says `Allow: /`, not `Disallow: /`. If it disallows,
   `NEXT_PUBLIC_SITE_URL` is missing or wrong.
3. **`/writing`** shows an empty feed, not the "not connected" notice. If the
   notice is still there, the Supabase env vars did not reach the build —
   redeploy.
4. **`/admin`** redirects to `/admin/login`.
5. Sign in by magic link. If the link errors, revisit step 6.
6. Publish a note from `/admin/posts`. It should appear on `/writing`
   immediately — the save calls `revalidatePath`, so it does not wait for the
   60-second window.
7. **Draft privacy — do this one properly.** Create a post, leave it as
   **draft**, note its slug, then open `/writing/<slug>` in a private window.
   It must **404**. If a draft renders to a signed-out visitor, stop and
   re-check the RLS policies before writing anything real.
8. **`/writing/rss.xml`** lists the published post and the `<link>` elements
   point at your real domain.
9. Send yourself a message through the contact form. Check both the `messages`
   table in Supabase **and** your inbox — they are separate failure modes.

---

## 12. Two things to do once, soon after

- **Keep-alive.** A free Supabase project **auto-pauses after one week of
  inactivity**, and the first visitor after that gets an error from `/writing`.
  `CRON_SECRET` and a `/api/cron/keepalive` route are specified for this but
  not built yet — it is Phase 3 work.
- **Backups.** The free tier has none. A weekly `pg_dump` into a private repo
  takes ten minutes to set up and is the difference between "my writing" and
  "my writing, until something goes wrong".

---

## 13. Phase 3 — gallery, todos, inbox

Three things, none of them code.

### 13a. Run the migration

Supabase → **SQL Editor** → paste `supabase/migrations/0003_gallery_todos.sql`
→ Run. It creates `photos` and `todos`, their RLS policies, and the storage
policies. It does **not** touch `messages`.

### 13b. Create the storage bucket

**Storage** → **New bucket**:

- Name: **`photos`** — must match exactly; the code and the storage policies
  both hard-code it.
- **Public bucket: on.**

> Public here means *readable by URL*, which is what a gallery is. It grants no
> write access — uploads are governed by the policies in 0003, and without them
> a public bucket would be an open file host. Create the bucket **after**
> running the migration, or the policies have no bucket to attach to.

### 13c. Set `CRON_SECRET`

Generate one and add it in Vercel (Production is enough):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`vercel.json` schedules `/api/cron/keepalive` daily at 06:00 UTC. Without the
secret the route returns 503 and refuses to run — failing closed is deliberate
for something that touches the database. Test it by hand:

```
https://your-site/api/cron/keepalive?secret=<the value>
```

> This exists because **Supabase Free auto-pauses after a week of inactivity**,
> and the first visitor after a quiet week would otherwise get an error — likely
> someone arriving from your resume.

### 13d. Verify

1. `/gallery` loads and says "No photographs yet" — not an error.
2. `/admin/photos` → upload two photos. Watch the per-file status go
   `resizing → uploading → done`. An 8 MB phone photo should land as a few
   hundred KB.
3. `/gallery` now shows them. Click one: the lightbox opens. Press
   **←/→** to move, **Escape** to close — focus should return to the thumbnail
   you opened.
4. `/admin/todos` → add a todo. It must appear **before** the request finishes.
   Tick it; it moves to "Done today".
5. **Privacy check.** Query `todos` with the anon key — it must return a
   permission error or an empty set, never a row:
   ```
   curl "$SUPABASE_URL/rest/v1/todos?select=id" -H "apikey: $ANON_KEY"
   ```
6. `/admin/inbox` → your existing contact message is listed. Mark it handled.
7. Confirm `/gallery` and `/admin/todos` are **not** in `/sitemap.xml`
   (the gallery is public but unlisted by design; todos are private).

---

## If something does not work

| Symptom | Cause |
|---|---|
| `/writing` says "not connected" on the live site | Env vars added but not redeployed |
| Magic link opens an error page | Callback URL not allow-listed (step 6) |
| Magic link email never arrives | **Check the Email provider master toggle first** (step 5) — a sign-in attempt returning `422 email_provider_disabled` means email auth is off entirely and nothing was ever sent. Otherwise: user never created, not auto-confirmed, or the built-in SMTP hourly cap (step 5a) |
| Emails arrive at first, then stop | Supabase's built-in SMTP rate limit. Point custom SMTP at Resend — step 5a |
| Signed in, but saving a post fails | Migration `0002_posts.sql` did not run, or RLS has no `authenticated` policy |
| A draft is publicly readable | RLS is off on `posts`. Re-run the verify query from step 3 — **fix before publishing anything real** |
| Contact form returns 503 | `SUPABASE_SERVICE_ROLE_KEY` missing in that environment |
| Row appears in `messages`, no email | Resend — key, or the `onboarding@resend.dev` recipient restriction |
| Live site not indexed | `NEXT_PUBLIC_SITE_URL` unset, so `robots.ts` emitted `Disallow: /` |
| Gallery renders but every image is broken | A trailing slash on `NEXT_PUBLIC_SUPABASE_URL` produced `host//storage/...`. Supabase serves that fine, but Vercel's image optimiser 400s because it no longer matches `remotePatterns`. The code now strips trailing slashes, so this is fixed regardless — but keep the variable clean anyway |
