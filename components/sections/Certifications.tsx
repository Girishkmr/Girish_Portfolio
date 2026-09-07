import { certifications } from '@/content/resume';
import { Section } from '@/components/ui/Section';

/**
 * FR-19. Certifications, newest first.
 *
 * Every row links to its public verification page rather than to a stored image
 * of the certificate. A screenshot proves nothing — anyone can make one — and
 * hosting five certificate scans would cost more bandwidth than the whole rest
 * of the page. The issuer's own verify URL is the only thing here that is
 * actually evidence, so it is the only thing linked.
 *
 * The link wraps the certificate name, not a trailing "verify" affordance: the
 * name is the thing a reader wants to click, and a separate link would put two
 * tab stops on one row for one destination.
 */
export function Certifications() {
  return (
    <Section id="certifications" eyebrow="Credentials" title="Certifications">
      <ul className="flex flex-col">
        {certifications.map((cert) => (
          <li
            key={cert.href}
            className="grid gap-x-8 gap-y-1 border-t border-rule py-5 sm:grid-cols-[6rem_1fr]"
          >
            <time
              dateTime={cert.dateISO}
              className="label pt-1 tabular-nums"
            >
              {cert.date}
            </time>

            <div>
              <p className="font-medium text-ink">
                <a
                  href={cert.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline decoration-rule-2 underline-offset-4 transition-colors hover:decoration-ink-3"
                >
                  {cert.name}
                  {/* The visible text does not say where the link goes, and a
                      screen-reader user hitting a link list would get five
                      course titles with no destination. */}
                  <span className="sr-only"> — verify credential</span>
                </a>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-3">{cert.issuer}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
