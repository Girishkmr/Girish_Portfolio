import { skills, sparkTechniques } from '@/content/resume';
import { Section } from '@/components/ui/Section';

/**
 * FR-04. Five groups, plus the Spark techniques.
 *
 * Deliberately not a wall of logo chips. A logo grid says "I have heard of
 * these"; a named list under a named group says which ones and in what role.
 * The Spark techniques sit apart because they are the things an interviewer
 * actually probes, and naming them precisely beats another row of tags.
 */
export function Skills() {
  return (
    <Section id="skills" eyebrow="With what" title="Skills">
      <dl className="flex flex-col">
        {skills.map((group) => (
          <div
            key={group.name}
            className="grid gap-x-8 gap-y-2 border-t border-rule py-5 sm:grid-cols-[10rem_1fr]"
          >
            <dt className="label pt-1">{group.name}</dt>
            <dd className="flex flex-wrap items-center gap-x-2 gap-y-2">
              {group.items.map((item, i) => (
                <span key={item} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden className="h-3 w-px bg-rule" />}
                  <span className="text-sm text-ink-2">{item}</span>
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 border-t border-rule pt-5">
        <p className="label mb-3">Spark, specifically</p>
        <p className="max-w-[62ch] font-mono text-xs leading-loose text-ink-3">
          {sparkTechniques.join('  ·  ')}
        </p>
      </div>
    </Section>
  );
}
