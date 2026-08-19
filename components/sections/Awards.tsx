import { awards, education } from '@/content/resume';
import { Section } from '@/components/ui/Section';

/**
 * FR-05. Awards, then the degree.
 *
 * The Codeforces rating ships without a profile link (decision L-5) — the
 * rating is the fact worth stating; the profile is a moving target.
 */
export function Awards() {
  return (
    <Section id="awards" eyebrow="Recognition" title="Awards & education">
      <ul className="flex flex-col">
        {awards.map((award) => (
          <li
            key={`${award.title}-${award.year}`}
            className="grid gap-x-8 gap-y-1 border-t border-rule py-5 sm:grid-cols-[6rem_1fr]"
          >
            <span className="label pt-1 tabular-nums">{award.year}</span>
            <div>
              <p className="font-medium text-ink">{award.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">
                <span className="text-ink-3">{award.org}</span>
                {award.detail ? ` — ${award.detail}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-12 border-t border-rule pt-5">
        <p className="label mb-3">Education</p>
        <h3 className="display text-xl lg:text-2xl">{education.institution}</h3>
        <p className="mt-2 leading-relaxed text-ink-2">
          {education.degree}, {education.field}. {education.specialisation}.
        </p>
        <p className="mt-2 font-mono text-xs text-ink-3 tabular-nums">
          {education.period} <span className="text-rule-2">·</span> CGPA {education.cgpa}
        </p>
      </div>
    </Section>
  );
}
