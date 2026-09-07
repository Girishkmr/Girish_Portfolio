-- Writing platform (FR-08, FR-09, FR-13). Phase 2.
--
-- One table, one type discriminator. REQUIREMENTS.html §2 argues the case:
-- two tables for notes and essays means two schemas, two editors and two
-- feeds, and in practice one of them goes stale within a month.
--
-- Run this in the Supabase SQL editor, or via `supabase db push`.

create type post_type   as enum ('note', 'essay');
create type post_status as enum ('draft', 'published');

create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  type         post_type   not null default 'note',
  status       post_status not null default 'draft',

  -- Essays are addressable and notes are not, which is the whole difference
  -- between the two types. The constraint below enforces that rather than
  -- trusting the editor to.
  slug         text unique,
  title        text,
  body_md      text not null,
  excerpt      text,
  cover_path   text,
  tags         text[] not null default '{}',
  reading_min  int,

  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- An essay needs somewhere to live and something to call itself.
  constraint essays_are_addressable check (
    type <> 'essay' or (slug is not null and title is not null)
  ),

  -- A published row must know when it was published, or the feed cannot order
  -- it and the RSS channel has nothing to put in <pubDate>.
  constraint published_rows_have_a_date check (
    status <> 'published' or published_at is not null
  ),

  -- Slugs go in URLs. Rejecting the bad ones here means the route never has to
  -- defend itself against them.
  constraint slug_is_url_safe check (
    slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  )
);

-- The feed's only query: published rows, newest first.
create index if not exists posts_feed_idx
  on public.posts (status, published_at desc);

-- Tag filtering (?tag=airflow) is a containment test, which is what GIN is for.
create index if not exists posts_tags_idx
  on public.posts using gin (tags);

-- ---------------------------------------------------------------------------
-- updated_at
--
-- Maintained by the database rather than by the editor. An application that
-- forgets to set it produces rows that silently lie about their own age.
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- This is the most important block in the project. Reads happen in Server
-- Components using the ANON key, which ships in the browser bundle by design —
-- so these policies, not the key's secrecy, are what stand between a visitor
-- and unpublished drafts.
--
-- The two policies below are deliberately asymmetric: the public one is
-- narrowed to a single status value, the owner one is not narrowed at all.
-- ---------------------------------------------------------------------------

alter table public.posts enable row level security;

-- Anyone may read published posts, and ONLY published posts. A draft is
-- invisible to anon even by direct id.
drop policy if exists "public reads published" on public.posts;
create policy "public reads published"
  on public.posts for select
  to anon, authenticated
  using (status = 'published');

-- The owner may do anything. Single-tenant: any authenticated session is the
-- owner, because no public sign-up route exists and Supabase Auth holds exactly
-- one account. If that ever stops being true, this policy must gain an
-- `auth.uid() = <owner column>` test before a second user is created.
drop policy if exists "owner writes" on public.posts;
create policy "owner writes"
  on public.posts for all
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- Verify before going live (REQUIREMENTS.html §7):
--
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
--
-- Every row must say true. A table with RLS enabled and no policy denies
-- everything, which is safe; a table with RLS not enabled is wide open to the
-- anon key, which is not.
-- ---------------------------------------------------------------------------
