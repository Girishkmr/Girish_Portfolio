import { identity, socials } from '@/content/resume';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

/**
 * Phase 0 deliverable: one fully styled section, built on the token system,
 * for review before the rest of the site is built on top of it.
 *
 * The 3D canvas (FR-01) lands in Phase 1 and mounts BEHIND this markup — the
 * name, role and calls to action stay plain DOM and must remain fully readable
 * and clickable with the canvas removed entirely (§9). Everything below is what
 * renders when there is no WebGL, which is why it is worth getting right first.
 */
export function Hero() {
  return (
    <section className="flex min-h-svh flex-col">
      {/* --- top bar -------------------------------------------------- */}
      <div className="shell flex items-center justify-between py-6">
        <span className="label text-ink">GK</span>
        <ThemeToggle />
      </div>

      {/* --- hero body ------------------------------------------------ */}
      <div className="shell flex flex-1 items-center py-16">
        <div className="spine w-full pl-6 sm:pl-10">
          {/* The eyebrow reads as one line of run metadata, which is how the
              subject's own tools label a thing. */}
          <p className="label mb-8 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{identity.role}</span>
            <span aria-hidden className="text-rule-2">
              &middot;
            </span>
            <span>{identity.employer}</span>
            <span aria-hidden className="text-rule-2">
              &middot;
            </span>
            <span>IIT Kharagpur</span>
          </p>

          <h1 className="display text-[clamp(3.25rem,11vw,7.5rem)]">
            Girish
            <br />
            <span className="italic">Kumar</span>
          </h1>

          <p className="mt-10 max-w-[52ch] text-lg leading-relaxed text-ink-2">
            {identity.tagline}
          </p>

          {/* One accent, spent once: the amber fill appears on exactly one
              control per screen. The second action is a rule outline, and the
              social links are quiet text. */}
          <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-3">
            <a
              href="#experience"
              className="rounded-sm bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
            >
              View the work
            </a>
            <a
              href="/resume.pdf"
              className="rounded-sm border border-rule-2 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink-3"
            >
              Resume
            </a>

            <span aria-hidden className="mx-1 h-4 w-px bg-rule" />

            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer noopener"
                className="label py-2 transition-colors hover:text-ink"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
