# Personal site & writing platform

Portfolio and writing platform for Girish Kumar — Data & AI Engineer at Visa
Global Data Solutions. A static CV surface plus three authenticated tools: a
merged writing feed, a photo journal, and a private task list.

The full requirements specification lives at `REQUIREMENTS.html` in the project
folder — open it in a browser. It defines scope, stack, data model, and the
build order. It is deliberately not committed: it is a working planning
document, and it discusses employer material in order to rule it out of scope.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase
(Postgres, Auth, Storage) · Resend · deployed on Vercel.

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
| `app/globals.css` | The "Ink & Amber" token system and both themes |
| `components/sections/` | Page sections, rendered from `content/resume.ts` |
| `components/ui/` | Shared primitives |

## One rule worth knowing

No CV fact is written directly into a component. It goes into the master career
document first, then into `content/resume.ts`, then it renders. Every known
error on the previous version of this site — a wrong CGPA, two stale social
handles — existed because the same fact was hand-typed into markup twice and
drifted apart.

## Build status

- [x] **Phase 0** — foundation: tokens, both themes, typed content, hero
- [ ] **Phase 1** — MVP portfolio surface (FR-01 → FR-07, FR-17)
- [ ] **Phase 2** — writing platform
- [ ] **Phase 3** — gallery & personal tools
