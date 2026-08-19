import { identity, socials } from '@/content/resume';

/**
 * Deliberately quiet, and deliberately carries no email address — contact is
 * form-only on an indexed page (decision L-6).
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="shell flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="label">
          {identity.name} <span className="text-rule-2">·</span> {identity.location}
        </p>

        <div className="flex items-center gap-5">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer noopener"
              className="label transition-colors hover:text-ink"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
