# Data model

Four tables in Postgres, one Storage bucket. Small enough to hold in your head,
which is the point — every column here earns its place.

Migrations live in `supabase/migrations/` and are applied by hand in the
Supabase SQL editor.

---

## Design principles

**1. Row-Level Security is the access control, not the application code.**
Reads use the anonymous key, which ships in the browser bundle by design. The
policies — not the key's secrecy — are what stand between a visitor and your
drafts.

**2. Constraints belong in the database.** A `CHECK` cannot be forgotten by a
future caller. Application validation gives a good error message; the constraint
guarantees the invariant.

**3. Each table's exposure is chosen deliberately**, and they differ:

| Table | Anonymous can | Owner can |
|---|---|---|
| `posts` | read **published only** | everything |
| `photos` | read all | everything |
| `todos` | **nothing** | own rows only |
| `messages` | **nothing** (not even insert) | nothing directly — service role only |

---

## `posts` — notes and essays

One table, one type discriminator. Two tables would mean two schemas, two
editors and two feeds — and in practice one goes stale within a month, which
reads worse than never having built it.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `type` | enum `note` \| `essay` | The whole reason this is one table |
| `status` | enum `draft` \| `published` | What RLS filters on |
| `slug` | text unique, nullable | Essays only. Null for notes |
| `title` | text, nullable | Optional on notes |
| `body_md` | text NOT NULL | Markdown source |
| `excerpt` | text | Generated on save |
| `cover_path` | text | Storage key. Reserved, unused |
| `tags` | text[] | GIN-indexed |
| `reading_min` | int | Essays only |
| `published_at` | timestamptz | Set once, on first publish |
| `created_at` / `updated_at` | timestamptz | `updated_at` by trigger |

### The difference between a note and an essay

A **note** is short, has no title, no page of its own, and renders inline in the
feed at full length. An **essay** has a title, a slug, its own URL, a reading
time and prev/next navigation.

That distinction is enforced, not merely intended:

```sql
constraint essays_are_addressable check (
  type <> 'essay' or (slug is not null and title is not null)
)
```

### The other two constraints

```sql
-- A published row must know when it was published, or the feed cannot order
-- it and RSS has nothing for <pubDate>.
constraint published_rows_have_a_date check (
  status <> 'published' or published_at is not null
)

-- Slugs go in URLs. Rejecting bad ones here means the route never has to
-- defend against them.
constraint slug_is_url_safe check (
  slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
)
```

### Why `updated_at` is a trigger

```sql
create trigger posts_touch_updated_at before update on posts
  for each row execute function touch_updated_at();
```

An application that forgets to set it produces rows that silently lie about
their own age. The database cannot forget.

### Indexes

```sql
create index on posts (status, published_at desc);  -- the feed's only query
create index on posts using gin (tags);             -- ?tag=airflow
```

GIN is the right index type for array containment — a B-tree cannot answer
"which rows have this element."

### Policies

```sql
alter table posts enable row level security;

create policy "public reads published"
  on posts for select to anon, authenticated
  using (status = 'published');

create policy "owner writes"
  on posts for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);
```

The asymmetry is the design: the public policy is narrowed to a single status
value; the owner policy is not narrowed at all.

> **Single-tenant assumption.** "Any authenticated user is the owner" is only
> safe because exactly one account exists and public sign-up is disabled. If a
> second user is ever created, this policy must first gain an
> `auth.uid() = <owner column>` test. This is written in the migration itself.

**The queries filter on `status` anyway**, which is redundant against the
policy. That is deliberate: if a policy is ever loosened by accident, the
application must not silently start serving drafts on the strength of one line
in a migration.

---

## `photos` — the gallery

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `storage_path` | text unique | **Key within the bucket, not a URL** |
| `caption`, `location` | text | |
| `album` | text | Slug-constrained |
| `taken_at` | date | |
| `width`, `height` | int | For `next/image` |
| `blur_data` | text | Base64 LQIP |
| `sort_order` | int | Manual ordering within an album |

**Why a key and not a URL:** URLs change when a bucket is renamed or moved
behind a CDN. The key does not. `photoUrl()` composes the URL at render time.

**Why dimensions are stored:** `next/image` needs them to reserve the box before
the file arrives. Without them every gallery load shifts the page as it fills —
a Lighthouse penalty (CLS) and a visibly cheap-looking page.

**Why `blur_data` is 16px wide:** it is inlined into the HTML of every gallery
page. A "slightly nicer" 64px version multiplies page weight by the number of
photos.

```sql
constraint photos_dimensions_sane check (
  (width is null and height is null) or (width > 0 and height > 0)
)
```

Policies: public `select` using `true`; owner `for all`. It is a gallery — the
entire point is that strangers can see it.

---

## `todos` — private

| Column | Type | Notes |
|---|---|---|
| `owner` | uuid → `auth.users` | **Defaults to `auth.uid()`** |
| `title` | text | 1–300 chars |
| `notes` | text | |
| `done` | boolean | |
| `priority` | smallint | 1 high · 2 normal · 3 low |
| `due_on` | date | |
| `completed_at` | timestamptz | |

```sql
create policy "own todos only"
  on todos for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
```

**No anonymous policy exists at all**, so anonymous access is denied outright
rather than filtered.

**`owner` defaults to `auth.uid()`** and the insert path never sets it. The
database decides who owns a row — a client-supplied owner is exactly what the
`with check` clause exists to reject.

```sql
constraint todos_completion_is_consistent check (
  (done and completed_at is not null) or (not done and completed_at is null)
)
```

`done` and `completed_at` must agree, or the "Done today" grouping silently
drops items completed without a timestamp.

### Verified, not assumed

An empty table proves nothing about RLS. This was tested by inserting a real row
via the service role, then querying as anonymous:

```
service role reads it  →  [{"title":"RLS privacy probe"}]
anon reads todos       →  []
anon inserts a todo    →  401 "new row violates row-level security policy"
```

---

## `messages` — contact submissions

The unusual one. **RLS enabled, and no policy for any role**, plus an explicit
`revoke all on messages from anon, authenticated`.

So nobody — not even your own signed-in session — can read or write it through
the normal API.

**Why:** an anon-insertable table is an open spam endpoint. Rate limiting in
front of a route handler is enforceable in a way an insert policy is not. All
writes go through `/api/contact`, which rate-limits, checks a honeypot and
validates with Zod before inserting under the service-role key.

**The consequence:** the inbox (FR-16) must also read via the service role. That
makes the session check in `app/admin/inbox-actions.ts` **the entire access
control**, with no database policy underneath it. The file says so explicitly.

Granting `authenticated` a read policy would have been simpler and was rejected:
it widens the table's exposure permanently to save one guard clause.

The `ip_hash` column stores a **salted hash**, never a raw IP — enough to
correlate a flood, not an identifier retained for everyone who ever wrote to you.

---

## Storage

One bucket, `photos`, **public**.

Public means *readable by URL* — what a gallery needs. It grants no write
access; those come from policies on `storage.objects`:

```sql
create policy "public reads photo objects"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'photos');

create policy "owner writes photo objects"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and auth.uid() is not null);
```

…plus update and delete equivalents. Without these, a public bucket is an open
file host.

Keys are `album/YYYY-MM-DD-<random>.webp` — URL-safe and unique, which the
original filename is neither.

---

## Types

`types/database.ts` is **generated**, not written:

```bash
npx supabase gen types typescript --linked > types/database.ts
```

It was hand-written during the build because the schema did not exist yet. Two
traps that cost real time, both now commented in the file:

- Omitting the `Relationships` field silently fails Supabase's `GenericTable`
  constraint. Every table then resolves to `never`, and the errors appear at
  unrelated call sites as *"Property 'id' does not exist on type 'never'."*
- Deriving `Insert`/`Update` with `Omit`/`Pick` intersections type-checks in
  isolation and then breaks inference the same way. Write them out in full.

---

## Verify before trusting

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public';
```

Every row must say `true`. A table with RLS enabled and no policy denies
everything — safe. A table with RLS *not* enabled is wide open to the anon key.
