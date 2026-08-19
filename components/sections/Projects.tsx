import { selectedProjects } from '@/content/resume';
import { Section } from '@/components/ui/Section';

/**
 * FR-17. Academic and personal work, kept separate from Experience.
 *
 * This section exists because the Visa work is platform-shaped — pipelines,
 * orchestration, retrieval plumbing — and does not on its own show that the
 * models underneath were built by hand. These do.
 */
export function Projects() {
  return (
    <Section id="projects" eyebrow="What else" title="Selected projects">
      <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
        {selectedProjects.map((project) => (
          <article key={project.name} className="border-t border-rule pt-5">
            <p className="label mb-2">{project.context}</p>
            <h3 className="display text-xl">{project.name}</h3>
            <p className="mt-3 leading-relaxed text-ink-2">{project.summary}</p>
            <p className="mt-4 font-mono text-xs leading-relaxed text-ink-3">
              {project.tags.join('  ·  ')}
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}
