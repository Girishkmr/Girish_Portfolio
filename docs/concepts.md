# Concepts, from scratch

The ideas this site is built on, explained without assuming you already know
them. Every section ends with **where it lives in this codebase**, so you can
read the real thing after the explanation.

If you only read one file here, read this one.

---

## 1. What actually happens when someone opens your site

You type `girish-portfolio-ten.vercel.app` and press enter. Roughly:

1. **DNS** turns that name into an IP address — a phone-book lookup.
2. Your browser opens a connection to that address and sends an **HTTP
   request**: a small block of text saying *GET /* plus some headers (what
   browser you are, what languages you read, any cookies you hold).
3. A **server** at the other end decides what to send back. Here that server is
   Vercel, running your Next.js app.
4. The server sends an **HTTP response**: a status code (200 = fine, 404 = no
   such page, 500 = the server broke), some headers, and a body — usually HTML.
5. The browser reads the HTML, sees it references CSS, JavaScript and images,
   and requests each of those too. Then it draws the page.

That is the whole model. Everything else is detail about step 3.

> **Status codes worth knowing**, because you will see them in logs:
> `200` OK · `301/307` go somewhere else · `400` your request was malformed ·
> `401` you are not authenticated · `403` authenticated but not allowed ·
> `404` not found · `429` too many requests · `500` the server crashed ·
> `503` the server is up but refusing to do this right now.

**In this codebase:** every route under `app/` handles one of these requests.

---

## 2. Frontend and backend, and why the line is blurry here

The traditional split:

- **Frontend** — code that runs in *your visitor's browser*. It can touch the
  screen and respond to clicks. It cannot be trusted, because the visitor can
  open devtools and change it.
- **Backend** — code that runs on *your server*. The visitor never sees it.
  It holds secrets and talks to the database.

The rule that follows is the single most important idea in web security:

> **Anything the browser sends you is a claim, not a fact.**
> Validate on the server. Always. Even if you already validated in the browser.

Next.js blurs the visual line because both are TypeScript in one project, but
the boundary is still absolute — it is just marked by file conventions rather
than by two separate codebases.

**In this codebase:** `'use client'` at the top of a file means it ships to the
browser. No directive means it runs only on the server. `import 'server-only'`
makes accidentally importing a server file into the browser a *build error*
rather than a silent leak — see `lib/markdown.ts`.

---

## 3. What an API is

An **API** is a URL that returns data instead of a page.

Open `/writing` and you get HTML for humans. A hypothetical `/api/posts` would
return the same information as **JSON** for programs:

```json
[{ "id": "…", "title": "First post", "status": "published" }]
```

**REST** is a convention for naming these: the URL identifies a *thing*, and the
HTTP method says what to do with it.

| Method | Means | Changes data? |
|---|---|---|
| `GET` | Give me this | No |
| `POST` | Create one of these | Yes |
| `PATCH` / `PUT` | Update this | Yes |
| `DELETE` | Remove this | Yes |

That "changes data?" column matters: a `GET` must never modify anything, because
browsers, crawlers and caches all assume it is safe to repeat.

**In this codebase:** `app/api/contact/route.ts` exports a `POST` function.
Supabase also gives you a full REST API over your tables for free — that is what
`https://<project>.supabase.co/rest/v1/posts` is, and it is what the
verification commands in `operations.md` are calling.

---

## 4. JavaScript: the parts this project actually uses

### Functions and arrow functions

```js
function greet(name) { return `hello, ${name}`; }   // classic
const greet = (name) => `hello, ${name}`;           // arrow, same thing
```

Arrow functions are shorter and, importantly, do not rebind `this`. In React
code you will see almost only arrows.

### Async, promises, and `await`

Some work takes time — a database query, a network request. JavaScript does not
sit and wait; it hands you a **Promise**, an object meaning *"a value, later."*

```js
const promise = fetch('/api/thing');   // returns immediately, not the data
```

`await` pauses *your function* until the promise resolves, without freezing the
page:

```js
async function load() {
  const response = await fetch('/api/thing');  // wait for the response
  const data = await response.json();          // wait for the body to parse
  return data;
}
```

A function containing `await` must be marked `async`. Calling an `async`
function gives you a promise, so callers usually `await` it too — which is why
`async` spreads up through a codebase.

**Why it matters here:** forgetting `await` is a classic bug. You get a Promise
object where you expected data, and it usually fails somewhere far away from the
mistake.

### Destructuring

```js
const { data, error } = await supabase.from('posts').select('*');
```

That pulls two named fields out of the returned object in one line. Every
Supabase call in this project returns `{ data, error }`, and **checking `error`
is not optional** — on failure `data` is `null`, and ignoring it turns a clear
database error into a confusing crash three lines later.

### `??` and `?.`

```js
post.title ?? 'Untitled'   // use 'Untitled' only if title is null/undefined
photo?.caption             // read caption, but don't crash if photo is null
```

`??` differs from `||`: `||` also replaces `0` and `""`, which is usually a bug
when the value is a count or a deliberate empty string.

**In this codebase:** `lib/posts.ts` is a good short file to read for all of
these together.

---

## 5. React, and why there are two kinds of component

React describes UI as a function of data. You do not write "change that text";
you describe what the page *should* look like for the current data, and React
works out the minimal change.

**Server Components** (the default here) run on the server, once, and send HTML.
They can query the database directly. They cannot use `useState` or respond to
clicks, because by the time the browser sees them they are already just markup.

**Client Components** (`'use client'`) ship their JavaScript to the browser.
They can hold state and handle interaction — and they cost bandwidth and CPU on
your visitor's device.

The rule: **server by default, client only where interaction demands it.**

| Hook | What it does | Used here in |
|---|---|---|
| `useState` | Remembers a value between renders | Nearly every client component |
| `useEffect` | Runs code *after* render — subscriptions, listeners | `MobileNav`, `SiteHeader` |
| `useRef` | A box that survives re-renders without causing one | Focus management |
| `useTransition` | Marks an update as non-urgent, gives you `isPending` | Todos, editor |
| `useOptimistic` | Shows a change immediately, discards it when real data arrives | `TodoList` |

> **A trap this project hit twice:** calling `setState` inside `useEffect` to
> synchronise state is an anti-pattern — it causes a second render, and React 19
> lints against it. If a value can be *computed* from existing state, compute it
> during render instead. See `incidents.md` §5.

---

## 6. Rendering: static, dynamic, and ISR

The same page can be produced at three different times, and the choice is a real
performance decision.

| Mode | Built | Good for | Cost |
|---|---|---|---|
| **Static** | Once, at deploy | Content that changes only when you redeploy | Fastest possible; served from a CDN |
| **Dynamic** | On every request | Anything personalised or query-dependent | A server runs per visitor |
| **ISR** | At deploy, then re-built on a timer | Content that changes occasionally | Fast, and self-updating |

**ISR** (Incremental Static Regeneration) is the useful middle. `revalidate = 60`
means: serve the cached page; if it is older than 60 seconds, serve it anyway
and rebuild in the background for the next visitor. Nobody waits.

Certain things force a route to be **dynamic**, whether you want it or not —
reading cookies, or reading query-string parameters. That is not arbitrary: if
output can differ per visitor, it cannot be one cached file.

**In this codebase:**

- `/` — static. CV content is a TypeScript file, so the home page cannot break
  when the database is down. That is deliberate.
- `/writing` — dynamic, because filters live in `?type=` and `?tag=`.
- `/writing/[slug]` — ISR, 60s.
- `/gallery` — ISR, 300s.
- `/admin/*` — dynamic, and never cached.

This is also where a real bug came from: reading cookies in a route meant to be
static made it 500. See `incidents.md` §2.

---

## 7. Authentication: cookies, JWTs, sessions

**Authentication** = who are you. **Authorisation** = what may you do. Different
questions, and conflating them is how systems leak.

HTTP has no memory — each request is independent. **Cookies** solve that: the
server sends a small value, the browser stores it and returns it on every
subsequent request to that site.

A **JWT** (JSON Web Token) is a signed string containing claims — user id, expiry
— plus a cryptographic signature. Anyone can *read* it. Only the issuer can
*forge* one, because only they hold the signing key.

That leads to a distinction worth internalising:

```js
supabase.auth.getSession()  // reads the cookie. Does NOT verify it.
supabase.auth.getUser()     // asks the auth server to VERIFY it.
```

`getSession()` will happily report a user for a fabricated cookie. **Anything
guarding access must use `getUser()`.**

**In this codebase:** `proxy.ts` and `lib/supabase/server.ts` use `getUser()`
everywhere. This was tested by sending a forged cookie at `/admin` in
production — it redirected to login, as it must. See `interview.md`.

### Magic links

Instead of a password, you receive a one-time link. Clicking it proves you
control the inbox, and the server issues a session. No password exists, so no
password can leak — the trade is that your email account becomes the key.

---

## 8. Row-Level Security — the most important idea here

Normally an app connects to a database as a superuser and *the application code*
decides who sees what. One forgotten `WHERE` clause leaks everything.

**RLS** moves that decision into the database. A policy is a rule attached to a
table, applied to every query automatically:

```sql
create policy "public reads published"
  on posts for select to anon
  using (status = 'published');
```

Now `select * from posts` as an anonymous visitor **cannot** return a draft.
Not "does not" — *cannot*. Forgetting the filter in application code is no longer
a security hole.

This is what makes it safe to ship the Supabase anon key in the browser. The key
is not the protection. **The policies are.**

> **The one mistake to avoid:** a table with RLS *enabled* and no policy denies
> everything — safe. A table with RLS *not enabled* is wide open to the anon key
> — catastrophic. Verify with:
> ```sql
> select tablename, rowsecurity from pg_tables where schemaname = 'public';
> ```
> Every row must say `true`.

Full detail in [`data-model.md`](./data-model.md).

---

## 9. Rate limiting

A **rate limit** caps how often one caller may hit an endpoint — for example
2 contact-form submissions per 10 minutes per IP address.

Why bother? Without it, a single script can submit ten thousand messages
overnight: your database fills, your email quota burns, and real enquiries are
buried. It is not about malice so much as asymmetry — one attacker's loop costs
them nothing and costs you everything.

The common approaches:

| Approach | How | Trade-off |
|---|---|---|
| **Fixed window** | ≤N per clock window | Simple; allows a burst at the boundary |
| **Sliding window** | ≤N in the last N minutes, always | Fairer; more state |
| **Token bucket** | Tokens refill over time; each request spends one | Allows bursts, limits sustained rate |

**In this codebase:** `lib/rate-limit.ts`, keyed by IP, checked *first* in
`app/api/contact/route.ts` — before parsing the body, because the cheapest
rejection should come first.

The IP is stored **hashed**, not raw. That is enough to correlate a flood
without keeping an identifier for every person who ever contacted you.

### The honeypot

A hidden form field real users never see. Bots fill in every field they find, so
anything arriving with it filled is automated. The response is a normal `200` —
telling a bot it was detected only helps it adapt.

---

## 10. Environment variables and secrets

Config that differs between your laptop and production — and must not be in git.

The critical distinction in Next.js:

| Prefix | Goes where | Example |
|---|---|---|
| `NEXT_PUBLIC_…` | **Baked into the browser bundle.** Public forever | `NEXT_PUBLIC_SUPABASE_URL` |
| no prefix | Server only. Never sent to the browser | `SUPABASE_SERVICE_ROLE_KEY` |

Putting a secret behind `NEXT_PUBLIC_` publishes it to every visitor. There is
no undo; the only fix is rotating the key.

> **They are read at build time.** Changing a variable in Vercel does nothing
> until you redeploy. This has already confused this project once.

**In this codebase:** `.env.local` (gitignored) holds real values;
`.env.local.example` is the committed template with blanks. During setup, real
keys were once pasted into the *template* — caught before commit. See
`incidents.md` §1.

---

## 11. Caching and the CDN

A **CDN** is a network of servers worldwide holding copies of your files. A
visitor in Bengaluru is served from nearby rather than from Virginia. Vercel
does this automatically.

**Cache-Control** headers tell caches how long a response stays fresh.
`s-maxage=600` means shared caches may reuse it for 10 minutes.
`stale-while-revalidate` means: serve the stale copy *and* fetch a fresh one in
the background, so nobody waits.

The eternal caching problem: **invalidation.** Publish a post and the cached
feed is now wrong. Two answers — wait for the timer (ISR), or push
(`revalidatePath()`). This project does both, so a publish is visible
immediately rather than up to 60 seconds later.

**In this codebase:** `app/admin/actions.ts` calls `revalidatePath('/writing')`
after every save.

---

## 12. Reading the dashboards

Covered properly in [`operations.md`](./operations.md) — what each Supabase and
Vercel screen means, which numbers matter, and what to check first when
something breaks.
