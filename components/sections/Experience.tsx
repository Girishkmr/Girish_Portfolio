import { experience, type ProjectCard, type Role } from '@/content/resume';
import { Section } from '@/components/ui/Section';

/**
 * FR-03. Two roles; the current one carries four project cards.
 *
 * Drawn as a graph rather than as a stack of cards: a hairline runs down the
 * left, each role is a node on it, and its projects hang off that node. Same
 * device as the hero — this is a site about pipelines, so the structure is
 * allowed to be one.
 */

function Tags({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5">
      {items.map((tag, i) => (
        <li key={tag} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden className="h-3 w-px bg-rule" />}
          <span className="font-mono text-xs text-ink-3">{tag}</span>
        </li>
      ))}
    </ul>
  );
}

function Project({ project }: { project: ProjectCard }) {
  return (
    <article className="border-t border-rule pt-6">
      <h4 className="display text-xl lg:text-2xl">{project.name}</h4>

      <p className="mt-3 max-w-[68ch] leading-relaxed text-ink-2">{project.summary}</p>

      {project.metrics.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {project.metrics.map((metric) => (
            <li key={metric} className="flex gap-3 text-sm leading-relaxed text-ink">
              <span aria-hidden className="font-mono text-ink-3">
                →
              </span>
              <span>{metric}</span>
            </li>
          ))}
        </ul>
      )}

      <Tags items={project.tags} />
    </article>
  );
}

function RoleBlock({ role }: { role: Role }) {
  return (
    <div className="relative pl-8">
      {/* The trunk. Each role is a node on it. */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-px bg-rule" />
      <span
        aria-hidden
        className="absolute left-[-3px] top-2 size-[7px] rounded-full bg-ink-3 ring-4 ring-ground"
      />

      <header className="mb-8">
        <p className="label mb-2">
          <time dateTime={role.start}>{role.period}</time>
        </p>
        <h3 className="display text-2xl lg:text-3xl">{role.title}</h3>
        <p className="mt-1 text-sm text-ink-2">
          {role.org} <span className="text-rule-2">·</span> {role.team}{' '}
          <span className="text-rule-2">·</span> {role.location}
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {role.projects.map((project) => (
          <Project key={project.name} project={project} />
        ))}
      </div>
    </div>
  );
}

export function Experience() {
  return (
    <Section id="experience" eyebrow="Where" title="Experience">
      <div className="flex flex-col gap-16">
        {experience.map((role) => (
          <RoleBlock key={`${role.org}-${role.title}-${role.start}`} role={role} />
        ))}
      </div>
    </Section>
  );
}
