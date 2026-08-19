import type { ReactNode } from 'react';

/**
 * The page's structural unit: a sticky left rail carrying the section's
 * identity, and a wide right column carrying its content.
 *
 * The rail is the same idea as the hero's spine — a fixed left edge that
 * everything hangs off, the way a DAG converges left to right. It is not
 * numbered: these sections are a set, not a sequence, and numbering them
 * would assert an order the content does not have.
 */
export function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  /** Short mono label. Says what kind of thing this section is. */
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="border-t border-rule">
      <div className="shell grid gap-x-14 gap-y-6 py-20 md:grid-cols-[11rem_1fr] lg:grid-cols-[13rem_1fr] lg:py-28">
        <div className="md:sticky md:top-24 md:self-start">
          <p className="label mb-3">{eyebrow}</p>
          <h2 id={`${id}-heading`} className="display text-3xl lg:text-4xl">
            {title}
          </h2>
        </div>

        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
