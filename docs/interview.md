# Interview questions

Questions an interviewer could reasonably ask about this project, with answers
grounded in what was actually built.

**Use these to understand, not to memorise.** A recited answer collapses at the
first follow-up. Every answer below points at a file — read it, then say it in
your own words.

The strongest thing about this project as interview material is that it has
**real trade-offs with reasons**, not just features. Lead with those.

---

## Opening: "Walk me through this project"

> A portfolio and writing platform. A static CV surface plus three
> authenticated tools — a merged writing feed, a photo gallery, and a private
> todo list.
>
> One Next.js app on Vercel, Supabase for Postgres, auth and file storage,
> Resend for email. Everything is on a free tier.
>
> The decision I'd point at first: **the home page never touches the
> database.** CV content is a typed TypeScript file, so it renders as static
> HTML with no client JavaScript. That matters because Supabase's free tier
> pauses a project after a week of inactivity — and the person most likely to
> arrive after a quiet week is a recruiter following a link from my résumé. The
> writing and gallery sections can be empty; the CV can never be a stack trace.

Keep it to about 30 seconds, then stop. Let them pick the thread.

---

## Security

### "Your database key is in the browser. Isn't that a vulnerability?"

The question they're really asking is whether you understand your own security
model.

> No — and it's deliberate. That's the *anonymous* key, and it's designed to be
> public. The protection is **Row-Level Security**: policies in Postgres that
> apply to every query automatically.
>
> For posts: anonymous can select only where `status = 'published'`. A draft
> isn't filtered out by my code — it's *unreachable*. Forgetting a `WHERE`
> clause can't leak it.
>
> The service-role key **does** bypass RLS, and it's server-only, used in
> exactly one place, and marked `server-only` so importing it into a client
> component is a build error.

**Follow-up: "How do you know RLS actually works?"**

> I tested it rather than assuming. An empty table proves nothing — so I
> inserted a real todo owned by my user via the service role, then queried as
> anonymous: reads returned `[]`, and an anonymous insert returned a 401 RLS
> violation. Same for a draft post requested by its exact slug in production —
> 404, not a page.

### "How does your auth work?"

> Magic link. One account, no public sign-up route. You enter the owner
> address, Supabase emails a one-time link, and the callback exchanges the code
> for a session cookie.
>
> Three layers guard `/admin`: `proxy.ts` turns unauthenticated navigations
> away, a route-group layout catches anything reaching a page another way, and
> RLS is what actually protects the rows.
>
> One detail I'd highlight: **every Server Action re-checks the session
> independently.** A Server Action is a callable POST endpoint with a public
> id — the proxy guards page navigations, not the action.

### "What's the difference between `getSession()` and `getUser()`?"

A favourite, because most people get it wrong.

> `getSession()` reads the JWT from the cookie and **doesn't verify it** — it
> will report a user for a forged or expired token. `getUser()` asks the auth
> server to validate it.
>
> Anything guarding access must use `getUser()`. I tested this by sending a
> fabricated session cookie at `/admin` in production — it redirected to login.
> With `getSession()` it would have walked straight in.

### "Why does your contact form use the service-role key?"

> Because `messages` has RLS enabled and **no policy for any role**, plus an
> explicit `revoke all`. Nothing can read or write it through the normal API.
>
> That's because an anon-insertable table is an open spam endpoint. Putting the
> write behind a route handler lets me rate-limit, check a honeypot and
> validate before inserting — none of which is enforceable in an insert policy.
>
> The consequence is that the inbox also reads via the service role, which
> makes *my* session check the entire access control with no policy underneath.
> That's a real trade-off, and the file says so explicitly. The alternative —
> granting `authenticated` a read policy — widens the table permanently to save
> one guard clause.

### "How do you prevent spam?"

> Three layers, cheapest first: an IP-keyed rate limit before the body is even
> parsed, a honeypot field bots fill and humans never see, and Zod validation
> server-side.
>
> The honeypot returns a normal `200` — telling a bot it was detected only
> helps it adapt. And the IP is stored **hashed**, which is enough to correlate
> a flood without keeping an identifier for everyone who ever contacted me.

---

## Architecture

### "Why Next.js and not plain React?"

> A React SPA ships a blank HTML file and paints after JavaScript loads. For a
> page a recruiter reads for 60 seconds — possibly on a poor mobile connection —
> that's the wrong trade.
>
> Server Components let the CV render as HTML with no client JS at all. Route
> handlers cover the contact endpoint without a separate backend to deploy.

### "How do your pages render?"

> Three modes, chosen per route. `/` is static. `/writing/[slug]` and
> `/gallery` are ISR — cached, rebuilt on a timer. `/writing` is dynamic
> because its filters live in the query string, and reading `searchParams`
> forces dynamic by definition.
>
> Publishing doesn't wait for the timer — the save action calls
> `revalidatePath()`, so the feed, the essay page, RSS and the sitemap all
> refresh immediately.

**Follow-up: "Why is `/writing` dynamic — couldn't you cache it?"**

> I could, by moving the filters into route segments. I chose not to: a
> shareable `?tag=rag` URL is worth more than the cache on a site at this
> traffic level. That's a trade-off I'd revisit if traffic changed.

### "Tell me about a caching bug."

Best answered with [`incidents.md`](./incidents.md) §2.

> Essay pages returned 500 in production while the feed worked. The error was
> *"Page changed from static to dynamic at runtime, reason: cookies."*
>
> The route has `generateStaticParams` and a revalidate window, so it's meant to
> be static — but my read path used the cookie-aware Supabase client, and
> reading cookies forces a route dynamic. Contradictory.
>
> The fix wasn't to drop ISR. It was realising **a published post is identical
> for every visitor**, so the read never needed a session. I added a cookie-free
> client for public reads. Same anon key, same RLS, route cacheable again.
>
> What I took from it: in the App Router, what you *read* determines how a route
> can *render*.

---

## Database

### "Walk me through your schema."

> Four tables. `posts` with a type discriminator for notes versus essays,
> `photos`, `todos`, and `messages`.
>
> The choice I'd defend is **one `posts` table rather than two.** Notes and
> essays differ — a note has no title and no page, an essay has a slug, reading
> time and its own URL — but two tables means two schemas, two editors and two
> feeds, and in practice one goes stale within a month. A discriminator plus a
> constraint gives the same separation:
>
> ```sql
> constraint essays_are_addressable check (
>   type <> 'essay' or (slug is not null and title is not null)
> )
> ```

### "Why constraints instead of validating in the app?"

> Because a constraint can't be forgotten by a future caller. Application
> validation gives a good error message; the constraint guarantees the
> invariant.
>
> Concretely: `done` and `completed_at` on todos have to agree, or the "Done
> today" grouping silently drops items. That's enforced in the database.
> `updated_at` is a trigger for the same reason — an app that forgets to set it
> produces rows that lie about their own age.

### "Your queries filter on `status` even though RLS does. Why the redundancy?"

> Deliberate. RLS is the guarantee; the filter is a second line. If a policy is
> ever loosened by accident, I don't want the application to silently start
> serving drafts on the strength of one line in a migration.

### "What would break at scale?"

Answer honestly — inventing scale you don't have is transparent.

> Tag counts are computed in JavaScript over all published posts. At a few
> hundred rows that's nothing; at ten thousand it's a full scan on every feed
> render, and I'd move it to a materialised view or a counts table.
>
> The feed has no pagination — fine at this size, wrong past a few hundred
> posts.
>
> And `todos` assumes a single user. The policy grants full write access to any
> authenticated user because exactly one account exists. If that ever changed,
> it needs an `auth.uid() = owner` test *before* a second user is created —
> which is written in the migration itself.

---

## Frontend

### "How did you handle images?"

> Photos are resized **in the browser** before upload — 2400px WebP via
> `createImageBitmap` and canvas — then uploaded straight to Supabase Storage.
> Only metadata goes through a Server Action.
>
> Two reasons. Supabase Free gives 1 GB and phone photos are 4–12 MB, so
> uploading originals fills half the quota with pixels no browser will display.
> And routing image bytes through a serverless function is slower, payload-
> capped, and billed as function bandwidth — while Storage already enforces the
> same policies.
>
> I also store intrinsic dimensions and a 16px blur placeholder, so
> `next/image` can reserve the box and the page doesn't shift as it loads.

### "How did you make it accessible?"

> Treated as a requirement rather than a pass at the end. The lightbox is the
> clearest example: focus is trapped while it's open, Escape closes it, focus
> returns to the exact thumbnail that opened it, arrows navigate, and background
> scroll is locked and restored.
>
> Every gallery tile is a real `<button>` — a div with an onClick is unreachable
> by keyboard, which would make the whole feature decorative.
>
> The colour tokens were contrast-checked before anything was built on them, and
> two failed WCAG AA and were replaced. That's in the CSS as a comment, so
> nobody "restores" them later.

### "Tell me about a CSS bug."

[`incidents.md`](./incidents.md) §4 — a good one, because the cause is
non-obvious.

> My mobile drawer was `position: fixed; inset: 0` and rendered as a 60px stub
> at the top of the screen instead of filling the viewport.
>
> The cause: it was nested inside the header, and the header has
> `backdrop-filter: blur()`. **An ancestor with a backdrop-filter becomes the
> containing block for fixed descendants**, so `inset-0` resolved to the
> header's box, not the viewport. `transform` and `will-change` do the same.
>
> Fix was making the drawer a sibling of the header. I found it by driving a
> real browser at 390px — it wasn't visible in the code.

### "Why `useOptimistic` rather than managing state yourself?"

> The todo list has to feel instant — a checkbox that waits 300ms for a round
> trip is the difference between a tool you use daily and one you abandon.
>
> `useOptimistic` discards the optimistic value automatically when the
> transition settles and real data arrives. Hand-rolling it with `useState`
> means owning the rollback on failure, and getting that wrong leaves a
> checkbox showing a state the database never accepted.

---

## Judgement

### "What would you do differently?"

Have a real answer. "Nothing" is a bad one.

> Three things.
>
> **I'd write the RLS tests first.** All my verification was manual — real, but
> manual. RLS is the only bug class here that's both silent and serious, so
> it's exactly what should be automated.
>
> **I'd normalise config at the boundary from the start.** A trailing slash on
> an environment variable produced broken images in production, because Supabase
> served the doubled path fine and only Vercel's image optimiser objected. Every
> easy check looked healthy. One `.replace(/\/+$/, '')` at the edge would have
> prevented it.
>
> **I'd reach for `dynamic()` on three.js earlier.** It's by far the largest
> dependency, for one decorative element. It survives because it never blocks
> content — but I'd want that decided up front, not retrofitted.

### "What's missing?"

> No tests, no error tracking, no CI, and no backups. Backups worry me most —
> Supabase Free has none, and the writing is the part I can't rebuild. A weekly
> `pg_dump` into a private repo is ten minutes of work and it's still on the
> list.

### "Why free tiers? Isn't that a limitation?"

> It's a constraint I designed around rather than fought. The auto-pause
> problem is a good example: instead of paying to make it go away, I added a
> guarded daily cron that keeps the project awake — and made the CV surface
> database-independent so even a failed cron can't take it down.
>
> Working inside a real constraint produced better architecture than an
> unlimited budget would have.

---

## Questions to ask them

Having some signals you think about systems, not just build them.

- How do you handle database migrations in production — and how do you roll one
  back?
- What does your caching story look like, and where does it bite you?
- How much of your access control is in application code versus the database?
- What's your test coverage on the security boundary specifically?

---

## Preparation

1. **Re-read [`incidents.md`](./incidents.md).** Debugging stories are the most
   convincing material here.
2. **Open the code while you revise.** These answers point at files for a
   reason.
3. **Know the numbers.** 4 tables. ~4 MB of resized photos from 19 MB of
   originals. 54 KB of JavaScript saved by not sharing the Zod schema. 3.8 MB →
   191 KB on the portrait.
4. **Be able to say what's wrong with it.** Naming your own gaps is a stronger
   signal than defending them.
