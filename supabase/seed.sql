-- Optional smoke-test rows for the writing feed.
--
-- This is NOT the "three real posts before calling Phase 2 done" the build plan
-- asks for — those have to be actually written. This exists so the feed, the
-- type filter, the tag filter, the essay page, the RSS channel and the sitemap
-- can all be verified end to end before a single real post is at risk.
--
-- Run it in the Supabase SQL editor after 0002_posts.sql, then delete the rows
-- when you publish for real:
--
--   delete from public.posts where slug like 'seed-%' or body_md like 'Seed:%';

insert into public.posts (type, status, title, slug, body_md, excerpt, tags, reading_min, published_at)
values
  (
    'note',
    'published',
    null,
    null,
    'Seed: a note renders inline in the feed at full length, with no page of its own. That is the whole difference between the two post types.',
    'Seed: a note renders inline in the feed at full length.',
    array['meta'],
    null,
    now() - interval '2 days'
  ),
  (
    'essay',
    'published',
    'Seed essay — checking the pipeline',
    'seed-essay-checking-the-pipeline',
    E'Seed: this row exists to prove the essay path works end to end.\n\n## A heading\n\nHeadings get anchors, so this section is linkable.\n\n```python\ndef hello(name: str) -> str:\n    return f"hello, {name}"\n```\n\nAnd a table, from remark-gfm:\n\n| Thing | Works |\n|---|---|\n| Shiki | yes |\n| Tags | yes |',
    'Seed: this row exists to prove the essay path works end to end.',
    array['meta', 'testing'],
    1,
    now() - interval '1 day'
  ),
  (
    'essay',
    'draft',
    'Seed draft — must never be public',
    'seed-draft-must-never-be-public',
    E'Seed: if you can read this without being signed in, the RLS policy in 0002_posts.sql is not doing its job.\n\nCheck it by opening /writing while signed out, and by requesting /writing/seed-draft-must-never-be-public directly — that must 404, not render.',
    'Seed: this draft must be invisible to anonymous visitors.',
    array['meta'],
    1,
    null
  );
