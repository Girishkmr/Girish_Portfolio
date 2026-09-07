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

Then turn off public sign-ups:

**Authentication** → **Sign In / Providers** → **Email** → turn **off**
*Allow new users to sign up* (older UI: Authentication → Settings → *Enable
sign ups*).

> Why both. `components/admin/LoginForm.tsx` passes `shouldCreateUser: false`,
> so the form itself will not create accounts. The dashboard toggle is the
> actual guarantee — it closes the API too. The RLS policy in `0002_posts.sql`
> grants full write access to *any* authenticated user, because the design
> assumes exactly one account exists. That assumption has to be enforced here.

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

## If something does not work

| Symptom | Cause |
|---|---|
| `/writing` says "not connected" on the live site | Env vars added but not redeployed |
| Magic link opens an error page | Callback URL not allow-listed (step 6) |
| Magic link email never arrives | User was never created, or not auto-confirmed (step 5) |
| Signed in, but saving a post fails | Migration `0002_posts.sql` did not run, or RLS has no `authenticated` policy |
| A draft is publicly readable | RLS is off on `posts`. Re-run the verify query from step 3 — **fix before publishing anything real** |
| Contact form returns 503 | `SUPABASE_SERVICE_ROLE_KEY` missing in that environment |
| Row appears in `messages`, no email | Resend — key, or the `onboarding@resend.dev` recipient restriction |
| Live site not indexed | `NEXT_PUBLIC_SITE_URL` unset, so `robots.ts` emitted `Disallow: /` |
