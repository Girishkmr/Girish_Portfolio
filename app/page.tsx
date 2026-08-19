import { Hero } from '@/components/sections/Hero';
import { RunStrip } from '@/components/sections/RunStrip';
import { About } from '@/components/sections/About';
import { Experience } from '@/components/sections/Experience';
import { Projects } from '@/components/sections/Projects';
import { Skills } from '@/components/sections/Skills';
import { Awards } from '@/components/sections/Awards';
import { Contact } from '@/components/sections/Contact';

/**
 * Phase 1, in reading order: who this is, what the work produced, who he is,
 * where he did it, what else he has built, with what, what it was recognised
 * for, and how to reach him.
 */
export default function Home() {
  return (
    <main id="main" className="flex-1">
      <Hero />
      <RunStrip />
      <About />
      <Experience />
      <Projects />
      <Skills />
      <Awards />
      <Contact />
    </main>
  );
}
