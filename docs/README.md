# Documentation

Written so the person who owns this site can understand and defend it — in an
interview, or six months from now when the reason for a decision has faded.

Every file explains *why*, not just *what*. Where something is genuinely a
trade-off, both sides are stated.

| File | Read it when |
|---|---|
| [`concepts.md`](./concepts.md) | You want the underlying ideas from scratch — what an API actually is, what happens when a browser requests a page, async/await, server vs client, JWTs, rate limiting. **Start here if any other doc loses you.** |
| [`architecture.md`](./architecture.md) | You want the shape of the system: what runs where, how a request flows, why each route renders the way it does |
| [`data-model.md`](./data-model.md) | You want the database: every table, every column, and why the security rules are written the way they are |
| [`tech-stack.md`](./tech-stack.md) | You want to know why each tool was chosen and what was rejected |
| [`incidents.md`](./incidents.md) | You want the bugs this build hit, how each was diagnosed, and what it taught. The most interview-useful file here |
| [`interview.md`](./interview.md) | You are preparing to talk about this project. Questions, with answers grounded in this codebase |
| [`operations.md`](./operations.md) | You need to read the Supabase or Vercel dashboard, or something is broken in production |

Setup instructions live in [`../SETUP.md`](../SETUP.md). The requirements
specification lives in `../REQUIREMENTS.html` (local, gitignored).

---

## Keeping these current

**These are not write-once files.** They are updated whenever a feature ships,
the schema changes, or the stack moves. A change that ships code without
updating the affected doc is unfinished.

The reason is specific to this project: the docs exist so their owner can
*understand* the system, not merely have a record of it. A stale doc here is
worse than a missing one — revising from a document that no longer matches the
code means confidently stating something false about your own project.

When adding something, check it against every file. One change usually touches
several:

| You changed… | Update |
|---|---|
| A table, column or RLS policy | `data-model.md`, and `architecture.md` if access patterns changed |
| A route, or how one renders | `architecture.md` |
| A dependency, or a version | `tech-stack.md` |
| Anything that broke in a non-obvious way | `incidents.md` — while you still remember |
| Something introducing an unfamiliar idea | `concepts.md` |
| A dashboard setting or an operational step | `operations.md`, and `../SETUP.md` |

If a doc cannot be properly updated in the same change, say so out loud rather
than leaving it quietly wrong.
