/**
 * Filing velocity: completed tasks per hour, over a rolling window.
 *
 * The rate is the more honest headline than the total for a game about watching numbers go up —
 * a total only tells you what already happened, while a rate tells you it is still happening
 * without requiring anyone to sit and watch it. Tasks rather than gold because `completedTasks`
 * only ever increases, so the figure reflects progress rather than the market's mood.
 *
 * Deliberately not part of the engine or the checkpoint. It is derived from state that already
 * exists, holds no authority, and its absence changes nothing about the simulation.
 */

export interface VelocitySample {
  readonly atMs: number;
  readonly completedTasks: number;
}

/** Samples older than this are dropped, so the figure tracks the recent past rather than the run. */
export const VELOCITY_WINDOW_MS = 5 * 60_000;

/** Below this the rate is too noisy to be worth showing, so it is not shown. */
const MINIMUM_SPAN_MS = 20_000;

const HOUR_MS = 60 * 60_000;

export function retainWindow(samples: readonly VelocitySample[], nowMs: number): VelocitySample[] {
  const cutoff = nowMs - VELOCITY_WINDOW_MS;
  const kept = samples.filter((sample) => sample.atMs >= cutoff);
  // Always keep one sample behind the cutoff, or the window would briefly have no span at all
  // every time the oldest sample expires.
  const oldest = samples.filter((sample) => sample.atMs < cutoff).at(-1);
  return oldest && kept.length > 0 ? [oldest, ...kept] : kept;
}

/**
 * Tasks per hour across the retained window, or null when there is not enough of one to say.
 * Returning null rather than a wild first number matters: an idle game's first impression is a
 * number that is supposed to look trustworthy.
 */
export function computeFilingVelocity(samples: readonly VelocitySample[]): number | null {
  if (samples.length < 2) return null;
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  const spanMs = last.atMs - first.atMs;
  if (spanMs < MINIMUM_SPAN_MS) return null;

  const completed = last.completedTasks - first.completedTasks;
  // A restored session or a new character can move the counter backwards. Report nothing rather
  // than a negative velocity, which would be a lie about a monotonic quantity.
  if (completed < 0) return null;

  return Math.round((completed / spanMs) * HOUR_MS);
}
