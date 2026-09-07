import Link from 'next/link';
import type { PostType } from '@/types/database';

/**
 * Type toggle and tag filter (FR-08).
 *
 * Plain links, not client-side state. The filter belongs in the URL: it makes
 * a filtered feed shareable and bookmarkable, it survives a reload, and it
 * costs zero client JavaScript on a page whose entire point is reading. The
 * cost is a server round trip per filter click, which on an ISR route is a
 * cache hit.
 */

type Props = {
  activeType?: PostType;
  activeTag?: string;
  tags: { tag: string; count: number }[];
};

const TYPES: { label: string; value?: PostType }[] = [
  { label: 'Everything' },
  { label: 'Notes', value: 'note' },
  { label: 'Essays', value: 'essay' },
];

export function FeedFilters({ activeType, activeTag, tags }: Props) {
  const hrefFor = (type?: PostType, tag?: string) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (tag) params.set('tag', tag);
    const query = params.toString();
    return query ? `/writing?${query}` : '/writing';
  };

  return (
    <div className="flex flex-col gap-5 border-b border-rule pb-8">
      <nav aria-label="Filter by type">
        <ul className="flex flex-wrap gap-2">
          {TYPES.map(({ label, value }) => {
            const isActive = activeType === value;
            return (
              <li key={label}>
                <Link
                  href={hrefFor(value, activeTag)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`label rounded-sm border px-3 py-1.5 transition-colors ${
                    isActive
                      ? 'border-ink-3 text-ink'
                      : 'border-rule text-ink-3 hover:border-ink-3 hover:text-ink'
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {tags.length > 0 ? (
        <nav aria-label="Filter by tag">
          <ul className="flex flex-wrap gap-2">
            {activeTag ? (
              <li>
                <Link
                  href={hrefFor(activeType)}
                  className="label rounded-sm border border-rule px-2 py-1 text-ink-3 transition-colors hover:border-ink-3 hover:text-ink"
                >
                  Clear tag
                </Link>
              </li>
            ) : null}

            {tags.map(({ tag, count }) => {
              const isActive = activeTag === tag;
              return (
                <li key={tag}>
                  <Link
                    href={hrefFor(activeType, isActive ? undefined : tag)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`label rounded-sm border px-2 py-1 transition-colors ${
                      isActive
                        ? 'border-ink-3 text-ink'
                        : 'border-rule text-ink-3 hover:border-ink-3 hover:text-ink'
                    }`}
                  >
                    #{tag}
                    <span className="ml-1.5 text-rule-2">{count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
