import { Hero } from '@/components/sections/Hero';
import { RunStrip } from '@/components/sections/RunStrip';

/**
 * Phase 0: the hero and the run strip. Phase 1 adds About, Experience,
 * Selected Projects, Skills, Awards and Contact beneath them
 * (FR-02 → FR-07, FR-17), in that order.
 */
export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <RunStrip />
    </main>
  );
}
