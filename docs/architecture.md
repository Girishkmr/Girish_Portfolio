# Architecture

What runs where, how a request flows, and why each piece renders the way it
does. Assumes the vocabulary in [`concepts.md`](./concepts.md).

---

## The shape of it

One deployed Next.js application, one Supabase project, one transactional email
provider. No separate backend service, no container, no queue.

```
                    ┌──────────────────────────────┐
  Visitor  ────────▶│                              │
  (anon key)        │      Next.js 16 on Vercel    │
                    │                              │
  You      ────────▶│  Server Components           │──── SQL + RLS ──▶ Postgres
  (session cookie)  │  Server Actions              │
                    │  Route Handlers              │──── upload ─────▶ Storage
                    │  proxy.ts (auth guard)       │
                    └──────────────────────────────┘──── POST ───────▶ Resend
                                                              │
                                                     Supabase project
```

Two things are worth noticing:

**The database is reached with the *anonymous* key on almost every path.** Not
because security is lax, but because Row-Level Security is doing the access
control. See [`data-model.md`](./data-model.md).

**There is exactly one exception**, and it is deliberate: the `messages` table
has no policy for any role, so the contact form and inbox use the service-role
key. That means *their own* checks are the entire access control, with no
database policy underneath. Both files say so at length.

---

## Rendering strategy, per route

| Route | Mode | Why |
|---|---|---|
| `/` | **Static** | CV content is `content/resume.ts`, a TypeScript file. The home page therefore has no database dependency and cannot break when Supabase is paused or down. This is the single most important architectural decision on the site |
| `/writing` | Dynamic | Filters live in `?type=` and `?tag=`. Reading query params forces dynamic — the output differs per visitor, so it cannot be one cached file |
| `/writing/[slug]` | ISR 60s | Pre-rendered at build via `generateStaticParams`; anything published later renders on first request, then caches |
| `/gallery` | ISR 300s | Photos change rarely, and each render costs a query plus image transformations |
| `/sitemap.xml` | ISR 1h | |
| `/writing/rss.xml` | ISR 10m | |
| `/robots.txt` | Static | |
| `/admin/*` | Dynamic, never cached | Personalised and privileged |
| `/api/*` | Dynamic | Route handlers |

**A publish does not wait for the timer.** `revalidatePath()` runs in the save
action, so `/writing`, the essay page, the RSS feed and the sitemap are all
refreshed immediately. The `revalidate` window is only the fallback.

---

## The four Supabase clients

This is the part most worth understanding, because choosing wrong is how drafts
leak or a route silently stops being cacheable.

| File | Key | Cookies? | Use for |
|---|---|---|---|
| `lib/supabase/public.ts` | anon | **No** | Public reads — the feed, essays, the gallery |
| `lib/supabase/server.ts` | anon + session | Yes | Anything needing the owner's identity: admin pages, Server Actions |
| `lib/supabase/admin.ts` | **service role** | No | `messages` only. Bypasses RLS entirely |
| `lib/supabase/client.ts` | anon | Browser | The login form, and Storage uploads |

### Why `public.ts` exists separately

Reading cookies makes a route **dynamic**. `/writing/[slug]` has
`generateStaticParams` and a `revalidate` window — it is meant to be cached.
Those two facts contradict, and Next fails the route at runtime with *"Page
changed from static to dynamic."*

The fix was not to give up ISR. It was to notice that **a published post is
identical for every visitor**, so the read never needed a session in the first
place. `public.ts` sends only the anon key and touches no cookies.

Security is unchanged: still the anon key, so the same RLS policies apply and
drafts stay invisible. Full write-up in [`incidents.md`](./incidents.md) §2.

### Why `admin.ts` is dangerous and still correct

The service-role key **bypasses RLS completely**. Three rules govern it:

1. Never in a Client Component. `import 'server-only'` makes that a build error.
2. Never without your own authorisation check *first* — there is no policy
   underneath to catch a mistake.
3. Prefer `server.ts` wherever it works.

It is used in exactly two places: `app/api/contact/route.ts` (insert) and
`app/admin/inbox-actions.ts` (read/update).

---

## Authentication: three layers

Defence in depth. Each layer alone would be insufficient.

| Layer | File | Catches |
|---|---|---|
| **1. Proxy** | `proxy.ts` | Unauthenticated *navigations* to `/admin`, before anything renders |
| **2. Route group** | `app/admin/(protected)/layout.tsx` | Anything reaching a page another way |
| **3. RLS** | `0002`, `0003` migrations | Everything else. The only layer that holds if code is wrong |

Plus: **every Server Action re-checks the session independently.** An action is
a callable POST endpoint with a public id — the proxy guards page navigations,
not the action itself. `getCurrentUser()` is the first line of every one.

> `proxy.ts`, not `middleware.ts` — Next.js 16 renamed the convention. Same
> behaviour, different filename.

### The login flow

```
/admin/login → signInWithOtp({ shouldCreateUser: false })
             → Supabase emails a one-time link
             → link → Supabase /auth/v1/verify → /auth/callback?code=…
             → exchangeCodeForSession(code) → session cookie → /admin
```

Two deliberate details:

- **The success message is identical whether or not the address owns the site.**
  Otherwise the form is an oracle confirming who the owner is.
- **`shouldCreateUser: false`.** Without it, Supabase would create an account for
  any address typed in, and the single-owner assumption the RLS policies rest on
  would be false within a day. The dashboard sign-up toggle is the real
  guarantee; this is the second lock.

`/auth/callback` also rejects any `next` parameter that is not a same-site
absolute path — otherwise it is an open redirect that lends your domain's
credibility to a phishing link. Note `//evil.com` is protocol-relative, which is
why there are two checks and not one.

---

## The contact form

Deliberately unusual in two ways.

**It stores the message before it sends the email, and treats a mail failure as
success.** Email is the part of a contact form that fails silently — an
unverified domain, a spam folder. A row in `messages` means an enquiry is never
lost invisibly. *The email is the notification; the row is the record.*

**Order of operations, cheapest rejection first:**

```
1. rate limit   → 429
2. honeypot     → 200, silently discarded
3. Zod schema   → 400 with per-field messages
4. INSERT, then send
```

**Validation is duplicated on purpose.** Sharing one Zod schema between client
and server was the obvious move and shipped 54 KB of unused JavaScript to every
visitor. So `lib/contact-schema.ts` is server-only and authoritative;
`lib/contact-fields.ts` is a zero-dependency shape the browser imports. The
server never trusts the client's copy.

---

## Images

Photos never travel through a Server Action. The browser resizes to 2400px WebP
via `createImageBitmap` + canvas, then uploads **directly to Supabase Storage**
using the session's own credentials. Only metadata round-trips to the server.

Why: Supabase Free gives 1 GB and phone photos are 4–12 MB. Uploading originals
fills half the quota with pixels no browser will display. Routing bytes through
a serverless function would also be slower, subject to a payload cap, and billed
as function bandwidth — while Storage already enforces the same policies.

If the object uploads but the row fails, the client deletes the object.
Otherwise it sits unreferenced, consuming quota, with nothing able to find it.

`next.config.ts` allows the Supabase host for `next/image`, scoped to
`/storage/v1/object/public/**` — not `/**`, which would also expose signed
endpoints to the optimiser.

---

## Failure behaviour

Every read path returns an empty result rather than throwing:

- No credentials → build stays green, `/writing` and `/gallery` say "not
  connected", `/admin` redirects to a login page that explains itself.
- Database down or paused → the writing and gallery sections are empty. **The CV
  surface is unaffected**, because it never touched the database.

This is not defensive habit; it is the specific reason `/` is static. A
free-tier Supabase project auto-pauses after a week of inactivity, and a
recruiter arriving from a résumé link must never meet a stack trace.

The **keep-alive cron** (`/api/cron/keepalive`, daily at 06:00 UTC via
`vercel.json`) prevents that pause. It is guarded by `CRON_SECRET` and **fails
closed** — an unset secret returns 503 rather than running unguarded, because an
unset secret is a misconfiguration, not a deployment without cron.

---

## Content flow — the one rule

```
Master career document  →  content/resume.ts  →  rendered
```

**No CV fact is written directly into a component.** Every known error on the
previous version of this site — a wrong CGPA, two stale social handles — existed
because the same fact was hand-typed into markup twice and drifted apart.

This applies to more than text. The portrait's path and dimensions live in
`content/resume.ts` too, because a hard-coded asset path is the same class of
mistake.
