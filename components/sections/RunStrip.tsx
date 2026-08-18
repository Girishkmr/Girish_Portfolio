import { headlineRuns, type Run } from '@/content/resume';

/**
 * The four headline results, drawn to scale.
 *
 * Form: paired magnitude bars. Every one of these numbers is a duration (or
 * step-count) reduction, so a proportional bar is the honest form — it shows
 * how much was removed rather than asserting it. The reference is each metric's
 * own "before", so the pairs are read within a row, never across rows.
 *
 * Colour: one measure, one hue. Amber marks the result; the "before" bar is a
 * recessive rule-coloured track. Numbers and labels wear text tokens, never the
 * series colour, and each bar is directly labelled — so identity is never
 * carried by colour alone and no legend box is needed.
 */

/** Longest bar as a % of the track, leaving room for the inline label. */
const SCALE = 82;

function RunRow({ run }: { run: Run }) {
  const afterPct = SCALE * (run.after / run.before);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="label">{run.label}</span>
        <span className="font-mono text-xs text-ink-3 tabular-nums">
          &minus;{Math.round((1 - run.after / run.before) * 100)}%
        </span>
      </div>

      {/* Bars share a left baseline so length is comparable at a glance. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <div
            className="h-2 rounded-full bg-rule"
            style={{ width: `${SCALE}%` }}
          />
          <span className="font-mono text-xs text-ink-3 tabular-nums whitespace-nowrap">
            {run.beforeLabel}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div
            className="h-2 min-w-[6px] rounded-full bg-accent"
            style={{ width: `${afterPct}%` }}
          />
          <span className="font-mono text-xs font-medium text-ink tabular-nums whitespace-nowrap">
            {run.afterLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

export function RunStrip() {
  return (
    <section aria-labelledby="runs-heading" className="border-t border-rule">
      <div className="shell py-10">
        <h2 id="runs-heading" className="label mb-8">
          Before <span className="text-rule-2">/</span> after, to scale
        </h2>

        <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {headlineRuns.map((run) => (
            <RunRow key={run.label} run={run} />
          ))}
        </div>

        {/* The table view: the same figures, available to screen readers and to
            anyone who cannot separate the bars. Visually redundant, so hidden. */}
        <table className="sr-only">
          <caption>Headline results before and after the work</caption>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">Before</th>
              <th scope="col">After</th>
            </tr>
          </thead>
          <tbody>
            {headlineRuns.map((run) => (
              <tr key={run.label}>
                <th scope="row">{run.label}</th>
                <td>{run.beforeLabel}</td>
                <td>{run.afterLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
