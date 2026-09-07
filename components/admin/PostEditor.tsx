'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deletePost, savePost } from '@/app/admin/actions';
import type { PostRow, PostStatus, PostType } from '@/types/database';

/**
 * FR-13. Markdown editor with a draft/publish state and localStorage autosave.
 *
 * Two decisions worth knowing about:
 *
 * **Autosave is local, not remote.** A keystroke-triggered write to Postgres
 * would be a request per character on the free tier. localStorage costs
 * nothing, survives the accidental tab close and the reload — which is the
 * actual failure being defended against — and is discarded the moment a real
 * save succeeds so a stale draft cannot resurrect over newer content.
 *
 * **Restoring it is offered, not automatic.** An effect that read storage and
 * pushed it into state on mount would be a cascading render, and worse, it
 * would silently overwrite whatever the server just sent — so opening a post
 * to read it could replace it with an older draft the writer had forgotten.
 * The stored copy is read through `useSyncExternalStore`, which is the
 * supported way to read something outside React without a render loop, and the
 * writer decides whether to take it.
 *
 * **No preview, for now.** FR-13 asks for live preview and this does not have
 * it — a deliberate omission, not an oversight. Rendering the preview means
 * running the same Markdown pipeline the reader gets, and that pipeline is
 * server-only: Shiki's grammars are megabytes and `lib/markdown.ts` is marked
 * `server-only` to keep them out of the browser. A faithful preview therefore
 * needs a server round trip per keystroke-ish, and an unfaithful one that
 * quietly differs from the published output is worse than none. The honest fix
 * is a debounced preview action rather than a client-side second renderer;
 * until then, save as a draft and look at the real page.
 */

const draftKey = (id: string | null) => `post-draft:${id ?? 'new'}`;

/** Storage can hold anything; a corrupt entry must not take the editor down. */
function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return typeof parsed?.body_md === 'string' ? (parsed as Draft) : null;
  } catch {
    return null;
  }
}

type Draft = {
  type: PostType;
  status: PostStatus;
  title: string;
  body_md: string;
  tags: string;
};

/**
 * Subscribe to cross-tab storage changes. `storage` fires only in OTHER tabs,
 * which is exactly right: this tab's own writes are already in React state.
 */
function subscribeToStorage(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

export function PostEditor({ post }: { post: PostRow | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const [draft, setDraft] = useState<Draft>({
    type: post?.type ?? 'note',
    status: post?.status ?? 'draft',
    title: post?.title ?? '',
    body_md: post?.body_md ?? '',
    tags: post?.tags.join(', ') ?? '',
  });

  const savedRef = useRef(false);
  const key = draftKey(post?.id ?? null);

  /* getSnapshot must return a stable value or this loops forever. A string
     from localStorage compares by value, so it is stable by construction —
     parsing to an object here would return a new reference every render. */
  const stored = useSyncExternalStore(
    subscribeToStorage,
    useCallback(() => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }, [key]),
    // Server render: there is no storage, and returning null keeps the markup
    // identical on both sides so hydration does not mismatch.
    () => null,
  );

  const recoverable = parseDraft(stored);
  const hasUnsavedDraft =
    !dismissed &&
    recoverable !== null &&
    recoverable.body_md !== (post?.body_md ?? '') &&
    recoverable.body_md !== draft.body_md;

  /* Persist on every change. Skipped once a save has succeeded, so the cleanup
     in onSubmit is not immediately undone by a trailing effect run. */
  useEffect(() => {
    if (savedRef.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {
      // Private mode, or quota. Losing autosave is not losing the post.
    }
  }, [draft, key]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    if (post?.id) formData.set('id', post.id);
    formData.set('type', draft.type);
    formData.set('status', draft.status);
    formData.set('title', draft.title);
    formData.set('body_md', draft.body_md);
    formData.set('tags', draft.tags);

    startTransition(async () => {
      const result = await savePost(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      savedRef.current = true;
      try {
        localStorage.removeItem(key);
        // A brand-new post was autosaved under the "new" key; clear that too,
        // or the next new post opens holding this one's text.
        localStorage.removeItem(draftKey(null));
      } catch {
        /* nothing to recover */
      }

      router.push('/admin');
      router.refresh();
    });
  }

  function onDelete() {
    if (!post?.id) return;
    setError(null);

    startTransition(async () => {
      const result = await deletePost(post.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/admin');
      router.refresh();
    });
  }

  return (
    <div className="shell py-16">
      <p className="label mb-3">{post ? 'Edit' : 'New'}</p>
      <h1 className="display text-3xl lg:text-4xl">
        {draft.type === 'essay' ? 'Essay' : 'Note'}
      </h1>

      {hasUnsavedDraft && recoverable ? (
        <div
          role="status"
          className="mt-6 flex flex-wrap items-center gap-3 rounded-sm border border-rule bg-surface-2 p-3 text-sm text-ink-2"
        >
          <span>This browser has an unsaved draft of this post.</span>
          <button
            type="button"
            onClick={() => setDraft(recoverable)}
            className="label rounded-sm border border-rule-2 px-2 py-1 hover:text-ink"
          >
            Restore it
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="label hover:text-ink"
          >
            Discard
          </button>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-8 flex max-w-[70ch] flex-col gap-6">
        <fieldset className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-2">
            <span className="label">Type</span>
            <div className="flex gap-2">
              {(['note', 'essay'] as const).map((value) => (
                <label
                  key={value}
                  className={`label cursor-pointer rounded-sm border px-3 py-1.5 transition-colors ${
                    draft.type === value
                      ? 'border-ink-3 text-ink'
                      : 'border-rule text-ink-3 hover:border-ink-3'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={value}
                    checked={draft.type === value}
                    onChange={() => set('type', value)}
                    className="sr-only"
                  />
                  {value}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="label">Status</span>
            <div className="flex gap-2">
              {(['draft', 'published'] as const).map((value) => (
                <label
                  key={value}
                  className={`label cursor-pointer rounded-sm border px-3 py-1.5 transition-colors ${
                    draft.status === value
                      ? 'border-ink-3 text-ink'
                      : 'border-rule text-ink-3 hover:border-ink-3'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={value}
                    checked={draft.status === value}
                    onChange={() => set('status', value)}
                    className="sr-only"
                  />
                  {value}
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        {/* Notes have no title by design — the date heads them in the feed. */}
        {draft.type === 'essay' ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="title" className="label">
              Title
            </label>
            <input
              id="title"
              value={draft.title}
              onChange={(event) => set('title', event.target.value)}
              className="rounded-sm border border-rule bg-surface px-3 py-2.5 text-ink outline-none focus-visible:border-ink-3"
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <label htmlFor="body" className="label">
            Body — Markdown
          </label>
          <textarea
            id="body"
            required
            rows={18}
            value={draft.body_md}
            onChange={(event) => set('body_md', event.target.value)}
            className="rounded-sm border border-rule bg-surface px-3 py-2.5 font-mono text-sm leading-relaxed text-ink outline-none focus-visible:border-ink-3"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="tags" className="label">
            Tags — comma separated
          </label>
          <input
            id="tags"
            value={draft.tags}
            onChange={(event) => set('tags', event.target.value)}
            placeholder="airflow, rag, spark"
            className="rounded-sm border border-rule bg-surface px-3 py-2.5 text-ink outline-none focus-visible:border-ink-3"
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-ink-2">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-sm bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Saving…' : draft.status === 'published' ? 'Publish' : 'Save draft'}
          </button>

          {post ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="rounded-sm border border-rule-2 px-5 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:border-ink-3 hover:text-ink disabled:opacity-50"
            >
              Delete
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
