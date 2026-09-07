# Tech stack, and why

Every choice, the alternative it beat, and what it costs. An interviewer will
ask "why X and not Y" about at least one of these — the honest answer is usually
a trade-off, not a superiority claim.

---

## The stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.3 |
| UI runtime | React | 19.2 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| 3D | three.js + @react-three/fiber | r0.185 · 9.x |
| Database | Supabase Postgres | 15 |
| Auth | Supabase Auth (magic link) | — |
| Storage | Supabase Storage | — |
| Email | Resend | 6.x |
| Validation | Zod | 4.x |
| Markdown | react-markdown + remark-gfm + Shiki | — |
| Hosting | Vercel | — |

Total cost: **₹0/month.** Everything is a free tier.

---

## Next.js

**Why:** React Server Components mean the CV content ships as HTML with *no
client JavaScript*. For a page whose primary audience spends 60–90 seconds
reading, that is the whole ballgame. Route handlers cover the contact endpoint
without a separate backend, and Vercel is its native target.

**Rejected:** a plain React SPA (blank HTML until JS loads — bad for SEO and for
a recruiter on a poor connection); Astro (better at pure static, but the admin
panel needs a real server runtime); a separate Express backend (a second thing
to deploy, secure and pay for, to serve one form endpoint).

**Costs:** the App Router's caching model is genuinely subtle, and it bit this
project — see [`incidents.md`](./incidents.md) §2. Version churn is real: Next 16
renamed `middleware.ts` to `proxy.ts` mid-build.

---

## TypeScript

**Why:** Supabase generates row types from the schema, so a column rename
becomes a *compile error* rather than a runtime `undefined` discovered by a
visitor. On a solo project with weeks between sessions, the types are the
memory.

**Costs:** the Supabase generic types are intricate enough that a malformed
schema type produces errors pointing at entirely the wrong file. Twice.

---

## Tailwind CSS v4

**Why:** v4 is CSS-first — design tokens live in an `@theme` block in
`globals.css`, so there is no `tailwind.config.ts` to drift out of sync. Both
light and dark themes come from the same custom properties.

**Rejected:** a component library (shadcn/ui, MUI). A portfolio's whole point is
that it does not look like a template, and this needs about eight components.
Plain CSS modules were closer, but co-locating styles with markup keeps
section files readable.

**Costs:** class strings get long. Mitigated by a handful of composed classes —
`.shell`, `.label`, `.display`, `.prose-ink`.

---

## Supabase

**Why Postgres over flat MDX files:** you can post a note from your phone in ten
seconds. A git-commit publishing flow sounds elegant and reliably stops being
used. There is also a strategic reason — a recruiter reading "data modelling,
RAG, vector search" on the résumé can see a live app with real auth, real
row-level security and a real schema behind it.

**Why Supabase over raw Postgres:** Auth, Storage and a REST API in one free
tier, and **RLS as the security model** rather than trusting application code.

**Rejected:** Firebase (document store; this project wanted real SQL, and SQL is
the thing a data engineer should be showing); PlanetScale/Neon (no bundled auth
or storage).

**Costs, and they are real:**

- Free projects **auto-pause after a week of inactivity** — hence the keep-alive
  cron.
- **No backups** on free. A weekly `pg_dump` is still outstanding.
- 500 MB database, 1 GB storage, 5 GB egress/month.
- The built-in auth email sender is rate-limited and not for production; this
  project points custom SMTP at Resend instead.

---

## Resend

**Why:** 3,000 emails/month free, a clean Node SDK, and it does double duty as
the SMTP provider for Supabase auth email.

**The known limitation:** until a domain is verified, `onboarding@resend.dev`
only delivers to the Resend account owner's own address. Fine here — the owner
is the only recipient — but it is why buying a domain (D-1) unblocks more than
vanity.

---

## Zod

**Why:** one schema describes the shape, the constraints and the error messages.

**The interesting part** is that the obvious use was wrong. Sharing one schema
between client and server shipped **54 KB of unused JavaScript to every
visitor** — on a page whose performance budget is the reason it exists. So:
`lib/contact-schema.ts` is server-only and authoritative;
`lib/contact-fields.ts` is a zero-dependency shape the browser imports.

Duplicated validation, deliberately. The server never trusts the client's copy,
so they are not really duplicates — one is UX, one is a security boundary.

---

## Shiki

**Why:** it runs the real TextMate grammars VS Code uses, so output looks like
an editor rather than regex guesswork — and it produces **static HTML**, so
highlighting costs the reader zero JavaScript.

**Why it forced a design:** Shiki is async and react-markdown's pipeline is not.
So code blocks are highlighted *up front*, keyed by their own source text, and
the renderer looks them up. `lib/markdown.ts` is marked `server-only` because
the grammars are megabytes.

Dual themes emit `--shiki-dark` custom properties alongside light colours, so
one render serves both themes and the theme toggle needs no re-highlight.

**Rejected:** Prism (smaller, noticeably worse); highlighting in the browser
(ships a parser to every reader).

---

## three.js + React Three Fiber

**Why at all:** the hero renders a directed acyclic graph — source systems into
transform layers into one output. It reads as ambient abstraction to a casual
visitor and as a data pipeline to anyone who has written an Airflow DAG, which
is exactly the audience split this site wants. It is a picture of the work
rather than decoration.

**How it is kept honest:** loaded via `dynamic()` with `ssr: false` so it is not
in the initial bundle; a server-rendered SVG poster is the first paint; disabled
entirely under `prefers-reduced-motion` and below 768px. The name, role and
buttons are plain DOM layered above — **the hero is fully readable and clickable
with the canvas removed entirely.**

**Cost:** the largest dependency here by far, for one decorative element. It
survives only because it never blocks content.

---

## Vercel

**Why:** the native Next.js target — ISR, `revalidatePath`, image optimisation
and cron all work without configuration. Preview deploys per branch.

**Costs:** vendor lock-in is real (ISR semantics and `next/image` are not
portable), and the image optimiser is strict about `remotePatterns` — which
produced a genuinely confusing bug ([`incidents.md`](./incidents.md) §3).

---

## Deliberately excluded

| Not used | Why |
|---|---|
| A component library | A portfolio should not look like a template |
| A state manager (Redux, Zustand) | RSC + `useState` covers it. Adding one would be resume-driven development |
| A CMS | The admin panel *is* the CMS, and building it is part of the portfolio |
| An ORM (Prisma, Drizzle) | Supabase's client is enough for four tables, and raw SQL in migrations is more legible — and more interview-defensible — than a schema DSL |
| Docker | Nothing to containerise. Vercel builds from git |
| A test suite | **The honest gap.** See below |

---

## The honest gaps

Worth being able to name these before an interviewer does.

**No automated tests.** Verification has been manual but real — production
smoke tests, a forged-cookie check against `/admin`, an RLS probe proving anon
cannot read `todos`. That is better than nothing and it is not a test suite. The
first thing worth testing is the RLS boundary, because it is the only bug class
here that is silent and serious.

**No error tracking.** A 500 in production is invisible unless someone reports
it. Sentry's free tier would close this.

**No CI.** Lint, typecheck and build are run by hand before pushing. A GitHub
Action would make that unskippable.

**No backups.** Supabase Free has none. This is the highest-risk gap on the
list — the writing is the part that cannot be rebuilt.
