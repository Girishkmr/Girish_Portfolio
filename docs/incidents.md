# Incidents

Real bugs this build hit, how each was found, and what it taught. Kept because
"tell me about a bug you debugged" is the interview question this project
answers best — and because the pattern behind several of them recurs.

Each entry: **symptom → what it looked like → actual cause → fix → lesson.**

> The recurring theme is worth stating up front. Most of these were hard not
> because the bug was subtle, but because **the symptom appeared far from the
> cause**, and the obvious signals all looked healthy.

---

## 1. Secrets pasted into the committed template

**Symptom** — none. Nothing was broken.

**What happened** — during setup, real credentials (service-role key, Resend
key) were filled into `.env.local.example` instead of `.env.local`. The
`.example` file is a *committed template*; `.gitignore` has `.env*` but then
`!.env.local.example` to keep it tracked.

**Caught by** — checking before staging, not by anything automatic:

```bash
git log -S "sb_secret_" -- .env.local.example   # empty: never committed
git status --short                              # ' M .env.local.example'
```

Working-tree only. Never committed, never pushed to the public repo.

**Fix** — `git checkout -- .env.local.example`. The real values were already in
`.env.local`, which *is* ignored.

**Lessons**

- The near-miss was one `git add -A` away from a public repo, where history
  cannot be quietly rewritten once anyone has cloned it.
- Scan the actual diff before pushing to a public repo:
  ```bash
  git log -p origin/main..HEAD | grep -nE "sb_secret_|re_[A-Za-z0-9]{10,}"
  ```
- If a secret ever does land: **rotate it.** Deleting the commit is not enough.

---

## 2. `/writing/[slug]` returned 500 in production

**Symptom** — the feed worked. Every essay page returned 500. A draft requested
directly also returned 500 instead of 404, which hid the fact that RLS was
working correctly.

**Looked like** — a database or rendering problem. It was neither.

```
Error: Page changed from static to dynamic at runtime /writing/…, reason: cookies
```

**Cause** — the route has `generateStaticParams` and `revalidate = 60`, so Next
renders it **statically**. But the read path used the cookie-aware Supabase
client, and calling `cookies()` forces a route **dynamic**. Those two facts are
contradictory, and Next fails the route at runtime.

**Why it was not obvious** — the same helper worked fine on `/writing`, which is
dynamic anyway because of its query-string filters. Only the cacheable route
broke.

**Fix** — not to abandon ISR, but to notice that **a published post is identical
for every visitor**. The read never needed a session. `lib/supabase/public.ts`
is a cookie-free client sending only the anon key, leaving the route cacheable.

Security unchanged: still the anon key, so the same RLS policies apply.

**Lesson** — in the App Router, *what you read* determines *how a route can
render*. `cookies()`, `headers()` and `searchParams` all force dynamic. Before
reaching for a client, ask whether the data actually varies per visitor.

---

## 3. The gallery rendered, and every image was broken

**Symptom** — `/gallery` returned 200. The right number of `<img>` tags. Every
image failed to load.

**Every obvious check passed:**

- Rows in `photos` — correct, with dimensions.
- Files in the bucket — present.
- Requesting an object directly — `200 image/webp`.

**The clue** was in the emitted markup:

```
/_next/image?url=…supabase.co%2F%2Fstorage%2Fv1%2F…
                              ^^ two slashes
```

**Cause** — `NEXT_PUBLIC_SUPABASE_URL` in Vercel had a **trailing slash**. Every
consumer builds paths by concatenation, so `${supabaseUrl}/storage/…` produced
`host//storage/…`.

**Why it was hard** — *Supabase serves the doubled path perfectly happily.* The
only thing that objected was Vercel's image optimiser, which returned 400
because `//storage/...` no longer matched the `/storage/v1/object/public/**`
pattern in `next.config.ts`. Every signal that was easy to check looked fine.

**Fix** — in code, not configuration:

```ts
export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .replace(/\/+$/, '');
```

Verified by rebuilding with a deliberately trailing-slashed value.

**Lesson** — **normalise input at the boundary.** A configuration value that can
be wrong in a way that only appears in production is a bug waiting to happen.
`lib/site.ts` already did this for `NEXT_PUBLIC_SITE_URL`; this should have
matched it from the start.

---

## 4. The mobile drawer rendered as a 60px stub

**Symptom** — tapping GK opened a short box pinned to the top of the screen with
its contents clipped, instead of a full-height side panel.

**The CSS looked right** — `position: fixed; inset: 0`, which should mean "fill
the viewport."

**Cause** — the drawer was rendered *inside* `<header>`, and the header has
`backdrop-blur-md`. **An ancestor with a `backdrop-filter` becomes the
containing block for `position: fixed` descendants.** So `inset-0` resolved to
the header's own ~60px box rather than the viewport.

`transform`, `filter`, `perspective`, `contain` and `will-change` all do this
too. It is the same reason a `position: fixed` element inside a CSS-transformed
parent scrolls with the page.

**Fix** — make the drawer a **sibling** of the header rather than a child.

**Lesson** — `position: fixed` is only relative to the viewport if no ancestor
has created a containing block. Also: this was found by driving a real browser
at 390px, not by reading the code. Some bugs are only visible.

---

## 5. `setState` inside `useEffect`, twice

**Symptom** — a lint error, both times, before either shipped:

```
Avoid calling setState() directly within an effect  react-hooks/set-state-in-effect
```

**First case** — the post editor restored a localStorage draft on mount by
setting state in an effect. Beyond the cascading render, it had a worse problem:
it would **silently overwrite whatever the server just sent**, so opening a post
to read it could replace it with an older forgotten draft.

*Fix:* read storage with `useSyncExternalStore` — the supported way to read
external state without a render loop — and offer a **Restore** button. The
writer decides.

**Second case** — the mobile drawer closed itself on route change via an effect.

*Fix:* derive it. Record *which path* the panel was opened on:

```ts
const [openedOn, setOpenedOn] = useState<string | null>(null);
const menuOpen = openedOn === pathname;
```

Now it is false on any other path automatically. No effect, no setState after
render, no flash of a stale open panel.

**Lesson** — if a value can be **computed** from existing state, compute it
during render. Effects are for synchronising with systems *outside* React —
event listeners, subscriptions, the DOM — not for keeping React state in step
with other React state.

---

## 6. Focus stolen on every mobile page load

**Symptom** — caught by reasoning about the code before it shipped: the drawer's
focus-restore effect would run on first mount, where `open` is `false`, and call
`focus()` on the trigger button. On every mobile visit, the page would scroll
the header into view and focus a button nobody pressed.

**Fix** — a `hasOpened` ref. Focus may only be *restored* somewhere it has
actually been.

**Lesson** — "on close, return focus" and "on mount, `open` is false" are the
same code path unless you distinguish them. Accessibility code has this shape
often: the correct behaviour on transition is wrong as an initial state.

---

## 7. Magic-link emails never arrived

**Symptom** — sign-in produced no email. Nothing in spam.

**Looked like** — an SMTP or deliverability problem. It was a switch.

**Found by asking the API instead of guessing:**

```bash
curl "$SUPABASE_URL/auth/v1/settings" -H "apikey: $ANON_KEY"
# → "email": false

curl -X POST "$SUPABASE_URL/auth/v1/otp" …
# → 422 {"error_code":"email_provider_disabled","msg":"Email logins are disabled"}
```

**Cause** — the Supabase Email panel has **two** toggles: a master *Enable Email
provider* and a sub-toggle *Allow new users to sign up*. Turning off the master
one disables **login as well as registration**, so nothing was ever sent.

The setup doc had said "turn off sign-ups" without warning that two switches sit
together — so the documentation caused this.

**Fix** — re-enable the provider, keep sign-ups disabled. `SETUP.md` now names
both toggles, states which value each wants, and gives the `curl` that answers
the question directly.

**Lesson** — when a message never arrives, first establish whether it was ever
*sent*. And when a doc leads someone into a trap, fixing the doc is part of
fixing the bug.

---

## 8. Supabase types resolved to `never`

**Symptom** — every write failed to compile:

```
Property 'published_at' does not exist on type 'never'
Argument of type '{…}' is not assignable to parameter of type 'never'
```

Reads compiled fine — **because `never` is assignable to anything**, so
`return data ?? []` silently type-checked. The client was untyped everywhere;
only the writes surfaced it.

**Cause** — the hand-written `Database` type omitted the `Relationships` field
that Supabase's `GenericTable` constraint requires. When the constraint fails,
the whole schema is discarded and every table resolves to `never` — and the
errors point at **call sites**, nowhere near the type that caused them.

A second instance of the same class: deriving `Insert`/`Update` with
`Omit`/`Pick` intersections type-checks in isolation and breaks inference the
same way.

**Found by** a deliberate error — assigning the result to a `number` to make the
compiler print what it had actually inferred.

**Fix** — add `Relationships: []`, write `Insert`/`Update` out in full, and
regenerate from the real schema once it existed.

**Lesson** — when a type error names a place that looks correct, suspect a
**failed generic constraint upstream**. And when the compiler will not tell you
what it thinks a type is, force it to by assigning it to something wrong.

---

## 9. Testing against a stranger's website

**Symptom** — production appeared to be serving stale code: `/writing` 404ed
while `/` returned 200.

**Cause** — the URL was a guess. `girish-portfolio.vercel.app` belongs to
somebody else — a Colorlib Bootstrap template — and happened to return 200 for
`/`. The real deployment was elsewhere.

**Caught by** actually reading the response:

```
title: Ronaldo - Free Bootstrap 4 Template by Colorlib
is Next app: False
```

**Lesson** — verify you are testing the thing you think you are testing. A 200
is not identity. It also produced a real finding: the wanted subdomain is taken,
which is a concrete argument for buying a domain.

---

## Patterns worth carrying forward

**Symptoms appear far from causes.** A trailing slash in an env var surfaced as
broken images. A missing type field surfaced as errors in unrelated files. When
the obvious checks all pass, the assumption is wrong, not the check.

**Ask the system, do not guess.** `/auth/v1/settings` answered in one request
what a spam-folder search would never have found. Most platforms will tell you
their state if you ask directly.

**Normalise at boundaries.** Configuration, user input and third-party responses
are all untrusted shapes. Clean them once, at the edge.

**An empty result proves nothing.** `todos` returning `[]` to anonymous could
mean RLS works — or that the table is empty. Insert a real row, *then* check.

**Some bugs are only visible.** The drawer bug could not have been found by
reading the code.
