# Personal site & writing platform

Portfolio and writing platform for Girish Kumar — Data & AI Engineer at Visa
Global Data Solutions. A static CV surface plus three authenticated tools: a
merged writing feed, a photo journal, and a private task list.

The full requirements specification lives at `REQUIREMENTS.html` in the project
folder — open it in a browser. It defines scope, stack, data model, and the
build order. It is deliberately not committed: it is a working planning
document, and it discusses employer material in order to rule it out of scope.

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

Nothing in Phase 0 or Phase 1 needs Supabase credentials — the CV content is a
typed TypeScript file, not database rows, so the home page never depends on the
database being awake.

Phase 2 does need them, but degrades rather than breaks without them: the build
stays green, `/writing` renders a "not connected" notice, `/admin` redirects to
a login page that says why, and every read path returns an empty result instead
of throwing. That is deliberate — a free-tier project auto-pauses after a week
of inactivity, and the CV surface must never go down with it.

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
| `components/admin/` | Login form and the post editor |
| `lib/` | Contact validation, rate limiting, Markdown, post queries |
| `lib/supabase/` | Server, browser and config clients |
| `types/database.ts` | Row types — **regenerate, don't hand-edit** |
| `proxy.ts` | Session refresh + `/admin` guard (Next 16 renamed `middleware.ts`) |
| `supabase/migrations/` | SQL, applied by hand in the Supabase SQL editor |

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

Measured before FR-19 was added. That section is server-rendered text and links
with no client JS, so the numbers should hold, but they have not been re-run.

## Build status

- [x] **Phase 0** — foundation: tokens, both themes, typed content, hero
- [x] **Phase 1** — MVP portfolio surface (FR-01 → FR-07, FR-17, FR-18, FR-19)
  - [x] FR-06 resume download — `Girish_resume_070926.pdf` is canonical (D-2 closed)
  - [x] FR-19 certifications — five credentials, each linked to its issuer's
        verification page rather than to a stored scan
  - [x] D-13 resume/site reconciliation — Visa tenure is past tense throughout,
        the micro-specialisation is removed as an error, CGPA is off the site,
        and the Paddy Disease thesis leads Selected projects
  - [ ] Contact form end to end — needs Supabase credentials and a Resend key
  - [ ] **D-3** — `public/resume.pdf` prints a phone number and a stale email
        address. Serving it publishes both on an indexed page
- [x] **Phase 2** — writing platform, **built but not yet switched on**
  - [x] Schema + RLS (`0002_posts.sql`), typed rows, Supabase clients
  - [x] Magic-link auth, `proxy.ts` guard, `/admin` dashboard and editor
  - [x] FR-08 feed, FR-09 essay pages, FR-13 editor
  - [x] FR-11 sitemap, robots, RSS
  - [ ] **Blocked:** create the Supabase project, run the two migrations, set
        the env vars, create the single auth user. See "Switching Phase 2 on"
  - [ ] Three real posts, per the build plan's definition of done
- [ ] **Phase 3** — gallery & personal tools

## Switching Phase 2 on

**`SETUP.md` is the click-by-click version** — where each key lives in the
Supabase dashboard, how to wire Vercel, and how to verify it worked. The
summary below is the same thing in eight lines.

Everything below is account creation and configuration — no code changes.

1. Create a Supabase project (free tier).
2. Run `supabase/migrations/0001_messages.sql`, then `0002_posts.sql`, in the
   SQL editor. Optionally `seed.sql` to smoke-test the feed.
3. Verify RLS before going near production:
   `select tablename, rowsecurity from pg_tables where schemaname='public';`
   — every row must say `true`.
4. Copy `.env.local.example` to `.env.local` and fill in the Supabase URL, the
   anon key, and the service-role key. Add the same three to Vercel.
5. In Supabase Auth, **create exactly one user** with your email, and disable
   public sign-ups. The login form passes `shouldCreateUser: false`, but the
   dashboard setting is the actual guarantee.
6. Add your site URL and `<site>/auth/callback` to the Auth redirect allow-list.
7. Regenerate row types so they come from the real schema rather than the
   hand-written stand-in:
   `npx supabase gen types typescript --linked > types/database.ts`
8. Sign in at `/admin/login` and publish something.

Steps 1–6 also unblock the Phase 1 contact form, which needs the same project
plus `RESEND_API_KEY` and `CONTACT_TO_EMAIL`.
