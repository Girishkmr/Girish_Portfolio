-- Phase 3: gallery and personal tools (FR-10, FR-14, FR-15).
--
-- Two tables with deliberately different exposure:
--
--   photos — public read, owner write. It is a gallery; the whole point is
--            that strangers can see it.
--   todos  — no anonymous policy at all. Private, and not linked from public
--            navigation. A public todo list is either fake data or an
--            overshare (REQUIREMENTS.html §3).
--
-- `messages` already exists from 0001 and needs no change here: it denies both
-- anon and authenticated outright, and the FR-16 inbox reads it through a
-- server route holding the service-role key, guarded by a session. That stays
-- true — do not add a read policy to it to make the inbox simpler.
--
-- Run in the Supabase SQL editor, or via `supabase db push`.

-- ---------------------------------------------------------------------- photos

create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),

  -- Key within the storage bucket, not a URL. URLs change when a bucket is
  -- renamed or moved behind a CDN; the key does not.
  storage_path text not null unique,

  caption      text,
  album        text not null default 'life',
  taken_at     date,
  location     text,

  -- Intrinsic dimensions, so next/image can reserve the box before the file
  -- arrives. Without these every gallery load shifts the page as it fills in.
  width        int,
  height       int,

  -- Base64 LQIP. Small enough to inline, and it means a slow connection sees
  -- the shape of the photo rather than a grey rectangle.
  blur_data    text,

  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),

  constraint photos_album_is_slug check (album ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint photos_dimensions_sane check (
    (width is null and height is null) or (width > 0 and height > 0)
  )
);

-- The gallery's only ordering: album, then manual order, then newest.
create index if not exists photos_album_order_idx
  on public.photos (album, sort_order, created_at desc);

alter table public.photos enable row level security;

drop policy if exists "public reads photos" on public.photos;
create policy "public reads photos"
  on public.photos for select
  to anon, authenticated
  using (true);

drop policy if exists "owner writes photos" on public.photos;
create policy "owner writes photos"
  on public.photos for all
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ----------------------------------------------------------------------- todos

create table if not exists public.todos (
  id           uuid primary key default gen_random_uuid(),

  -- Defaulting to auth.uid() means the column cannot be forgotten on insert,
  -- and the policy below compares against it rather than trusting the client
  -- to have sent the right owner.
  owner        uuid not null references auth.users(id) on delete cascade
                 default auth.uid(),

  title        text not null check (char_length(title) between 1 and 300),
  notes        text,
  done         boolean not null default false,
  priority     smallint not null default 2 check (priority between 1 and 3),
  due_on       date,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),

  -- done and completed_at must agree, or "Done today" grouping silently drops
  -- items that were completed without a timestamp.
  constraint todos_completion_is_consistent check (
    (done and completed_at is not null) or (not done and completed_at is null)
  )
);

create index if not exists todos_owner_open_idx
  on public.todos (owner, done, due_on);

alter table public.todos enable row level security;

-- No anon policy exists, so anonymous access is denied entirely — not merely
-- filtered. Even authenticated users only ever see their own rows.
drop policy if exists "own todos only" on public.todos;
create policy "own todos only"
  on public.todos for all
  to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- --------------------------------------------------------------- storage rules
--
-- Create the bucket first, in Dashboard → Storage → New bucket:
--   name: photos   ·   public: yes
--
-- Public means anyone may READ an object by URL, which is what a gallery
-- needs. It does NOT grant writes — those are governed by the policies below,
-- and without them a public bucket would be an open file host.

drop policy if exists "public reads photo objects" on storage.objects;
create policy "public reads photo objects"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'photos');

drop policy if exists "owner writes photo objects" on storage.objects;
create policy "owner writes photo objects"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos' and auth.uid() is not null);

drop policy if exists "owner updates photo objects" on storage.objects;
create policy "owner updates photo objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'photos' and auth.uid() is not null);

drop policy if exists "owner deletes photo objects" on storage.objects;
create policy "owner deletes photo objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos' and auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- Verify, as always:
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- Every row must say true.
--
-- And confirm todos are genuinely private by querying them with the anon key:
--   it must return a permission error or an empty set, never a row.
-- ---------------------------------------------------------------------------
