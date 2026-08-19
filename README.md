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
| `lib/` | Contact validation, rate limiting |
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

## Build status

- [x] **Phase 0** — foundation: tokens, both themes, typed content, hero
- [x] **Phase 1** — MVP portfolio surface (FR-01 → FR-05, FR-07, FR-17, FR-18)
  - [ ] FR-06 resume download — blocked on choosing a canonical PDF (D-2)
  - [ ] Contact form end to end — needs Supabase credentials and a Resend key
- [ ] **Phase 2** — writing platform
- [ ] **Phase 3** — gallery & personal tools
