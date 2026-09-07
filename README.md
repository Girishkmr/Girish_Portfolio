# Personal site & writing platform

Portfolio and writing platform for Girish Kumar — Data & AI Engineer, formerly
at Visa Global Data Solutions. A static CV surface plus three authenticated
tools: a merged writing feed, a photo journal, and a private task list.

**Live:** <https://girish-portfolio-ten.vercel.app>

The full requirements specification lives at `REQUIREMENTS.html` in the project
folder — open it in a browser. It defines scope, stack, data model, and the
build order. It is deliberately not committed: it is a working planning
document, and it discusses employer material in order to rule it out of scope.

## Documentation

[`docs/`](./docs/) explains how this works and why, written to be understood
rather than merely recorded.

| | |
|---|---|
| [`docs/concepts.md`](./docs/concepts.md) | The underlying ideas from scratch — APIs, async/await, server vs client, JWTs, RLS, rate limiting, caching. **Start here** |
| [`docs/architecture.md`](./docs/architecture.md) | What runs where, how a request flows, why each route renders as it does |
| [`docs/data-model.md`](./docs/data-model.md) | Every table and column, and why the security rules read the way they do |
| [`docs/tech-stack.md`](./docs/tech-stack.md) | Why each tool, what it beat, what it costs — including the honest gaps |
| [`docs/incidents.md`](./docs/incidents.md) | Real bugs, how each was diagnosed, what it taught |
| [`docs/interview.md`](./docs/interview.md) | Questions about this project, answered from the code |
| [`docs/operations.md`](./docs/operations.md) | Reading the Supabase and Vercel dashboards; what to check when something breaks |

**These are kept current.** A change that ships code without updating the
affected doc is unfinished — see `docs/README.md`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · three.js
via @react-three/fiber (hero only, lazy) · Zod · Supabase (Postgres, Auth,
Storage) · Resend · deployed on Vercel.

## Running locally

```bash
npm install
cp .env.local.example .env.local   # fill in as phases require
npm run dev
```

The home page needs no credentials at all — CV content is a typed TypeScript
file, not database rows, so it never depends on the database being awake.

Everything else degrades rather than breaks without credentials: the build
stays green, `/writing` and `/gallery` render a "not connected" notice, `/admin`
redirects to a login page that says why, and every read path returns an empty
result instead of throwing. That is deliberate and worth preserving — a
free-tier project auto-pauses after a week of inactivity, and the CV surface
must never go down with it.

Sign-in needs `http://localhost:3000/**` in the Supabase Auth redirect
allow-list, which is separate from the production entry.

```bash
npm run build      # production build
npm run lint       # eslint
npx tsc --noEmit   # typecheck (run a build first, so route types exist)
```

## Where things live

| Path | What it is |
|---|---|
| `content/resume.ts` | **Single source of truth** for every CV fact on the site |
| `content/nav.ts` | The section list, consumed by both the nav and the page |
| `app/globals.css` | The "Ink & Amber" token system and both themes |
| `components/sections/` | Page sections, rendered from `content/resume.ts` |
| `components/hero/` | The DAG graph, its SVG poster, and the WebGL field |
| `components/ui/` | Shared primitives, plus the theme and media-query stores |
| `components/writing/` | Feed cards, filters, and the Markdown renderer |
| `components/gallery/` | Masonry grid and the keyboard lightbox |
| `components/todos/` | The optimistic todo list |
| `components/admin/` | Login form, post editor, photo manager, inbox rows |
| `app/writing/`, `app/gallery/` | Public routes |
| `app/admin/` | Auth-guarded routes and their Server Actions |
| `lib/` | Contact validation, rate limiting, Markdown, post/photo queries |
| `lib/supabase/` | Four clients: `public` (cookie-free), `server` (session), `admin` (service role), `client` (browser) |
| `lib/image-resize.ts` | Browser-side downscale to WebP, before upload |
| `types/database.ts` | Row types — **regenerate, don't hand-edit** |
| `proxy.ts` | Session refresh + `/admin` guard (Next 16 renamed `middleware.ts`) |
| `vercel.json` | The daily keep-alive cron schedule |
| `supabase/migrations/` | SQL, applied by hand in the Supabase SQL editor |
| `SETUP.md` | Click-by-click dashboard setup and the failure-mode table |

### Which Supabase client to use

Getting this wrong is how drafts leak or a route stops being cacheable.

| Client | Key | Use for |
|---|---|---|
| `public.ts` | anon | Public reads. Touches no cookies, so the route stays static/ISR |
| `server.ts` | anon + session cookie | Anything needing the owner's identity — admin pages, Server Actions |
| `admin.ts` | **service role** | Only `messages`, which has no policy for any role. Bypasses RLS, so the caller must authorise first |
| `client.ts` | anon | Browser only: the login form and Storage uploads |

## One rule worth knowing

No CV fact is written directly into a component. It goes into the master career
document first, then into `content/resume.ts`, then it renders. Every known
error on the previous version of this site — a wrong CGPA, two stale social
handles — existed because the same fact was hand-typed into markup twice and
drifted apart.

## Two things the contact form does on purpose

It **stores the message before it sends the email**, and treats a mail failure
as success. Email is the part of a contact form that fails silently — a
verified-domain problem, a spam folder — and a row in `messages` means an
enquiry is never lost invisibly. The email is the notification, not the record.

It **validates on the server with Zod and on the client by hand**. Sharing the
schema was the obvious thing to do and it shipped 54KB of unused JavaScript to
every visitor. `lib/contact-schema.ts` is server-only and authoritative;
`lib/contact-fields.ts` is the zero-dependency shape the browser imports.

## Verified

Production build, Lighthouse mobile:

| Performance | Accessibility | Best practices | SEO |
|---|---|---|---|
| 97 | 100 | 100 | 100 |

**Stale.** Measured on the Phase 1 surface, before the writing platform, the
gallery and the mobile drawer existed. The gallery in particular ships real
images and is the one route likely to have moved. Re-run before quoting these.

## Build status

- [x] **Phase 0** — foundation: tokens, both themes, typed content, hero
- [x] **Phase 1** — MVP portfolio surface (FR-01 → FR-07, FR-17, FR-18, FR-19)
  - [x] FR-06 resume download — `Girish_resume_070926.pdf` is canonical (D-2 closed)
  - [x] FR-19 certifications — five credentials, each linked to its issuer's
        verification page rather than to a stored scan
  - [x] D-13 resume/site reconciliation — Visa tenure is past tense throughout,
        the micro-specialisation is removed as an error, CGPA is off the site,
        and the Paddy Disease thesis leads Selected projects
  - [x] Contact form end to end — verified in production: row stored, email
        sent, honeypot discarded, rate limit engaged
- [x] **Phase 2** — writing platform, **live**
  - [x] Schema + RLS (`0002_posts.sql`), typed rows, Supabase clients
  - [x] Magic-link auth, `proxy.ts` guard, `/admin` dashboard and editor
  - [x] FR-08 feed, FR-09 essay pages, FR-13 editor
  - [x] FR-11 sitemap, robots, RSS
- [x] **Phase 3** — gallery & personal tools, **live**
  - [x] FR-10 gallery — masonry grid by album, keyboard lightbox with focus trap
  - [x] FR-14 photo manager — browser-side resize to WebP before upload
  - [x] FR-15 todos — optimistic UI, due dates, priority, "Done today"
  - [x] FR-16 inbox — reads via service role behind the session guard
  - [x] Keep-alive cron, guarded by `CRON_SECRET`, daily at 06:00 UTC
- [x] Mobile navigation drawer behind the `GK` mark
- [ ] **Phase 4** — see "What's next"

Setup is finished. `SETUP.md` remains the reference for how each dashboard
setting was configured and the symptom → cause table for when one breaks.

## What's next

Open, in rough priority order. Nothing here blocks anything else.

| | Item | Why |
|---|---|---|
| **1** | **D-3 — the résumé PDF** | `public/resume.pdf` prints a phone number and the stale `girishkumarbtp2112@` address. Serving it publishes both on an indexed page, against the site's own no-public-contact rule |
| **2** | **Three real posts** | Phase 2's own definition of done. The feed currently holds seed rows, which should be deleted: `delete from public.posts where slug like 'seed-%' or body_md like 'Seed:%';` |
| **3** | **D-6 — finish the gallery** | 5 of 16 photos uploaded, all in one `life` album. The spec wants ~20 across a few albums, and consent from anyone identifiable |
| **4** | **D-1 — a domain** | `girish-portfolio-ten.vercel.app` on a résumé undercuts the work. Also needed before a Resend domain can be verified, which is what frees the contact form and auth email from the `onboarding@resend.dev` recipient restriction |
| **5** | **Rotate credentials** | The service-role and Resend keys were pasted into a chat during setup |
| **6** | **FR-11 per-post OG images** | Metadata ships; generated image cards do not. This is what makes a shared link look deliberate |
| **7** | **Backups** | Supabase Free has none. A weekly `pg_dump` into a private repo is ten minutes and the difference between "my writing" and "my writing, until something goes wrong" |
| **8** | **Re-run Lighthouse** | The 97/100/100/100 below predates Phases 2 and 3 |
| **9** | **"Ask my portfolio"** | The Phase 4 headline: a RAG chatbot over the posts and CV using pgvector. Demonstrates the exact skillset the master document leads with, on live inspectable data |
