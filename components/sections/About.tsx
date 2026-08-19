import Image from 'next/image';
import { bio, identity, stats } from '@/content/resume';
import { Section } from '@/components/ui/Section';

/**
 * FR-02. Bio, portrait, four figures.
 *
 * The figures are hairline-ruled rather than boxed. A card with a border and a
 * shadow around a single number is the default treatment everywhere; a rule
 * above the number does the same separating job with a tenth of the ink, and
 * keeps the section reading as one page rather than four widgets.
 */
export function About() {
  return (
    <Section id="about" eyebrow="Who" title="About">
      <div className="grid gap-10 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="flex flex-col gap-5">
          {bio.map((paragraph, i) => (
            <p key={i} className="max-w-[62ch] leading-relaxed text-ink-2">
              {paragraph}
            </p>
          ))}
        </div>

        <figure className="order-first sm:order-none">
          <Image
            src="/girish-kumar.jpeg"
            alt={`${identity.name}, ${identity.role}`}
            width={827}
            height={1063}
            priority={false}
            sizes="(min-width: 640px) 13rem, 9rem"
            className="w-36 rounded-sm border border-rule object-cover sm:w-52"
          />
          <figcaption className="label mt-3 leading-relaxed">
            {identity.location}
          </figcaption>
        </figure>
      </div>

      <dl className="mt-14 grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="border-t border-rule pt-4">
            <dt className="label mb-2 leading-relaxed">{stat.label}</dt>
            <dd className="display text-3xl tabular-nums lg:text-4xl">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
