/**
 * How long until the next promotion, projected from the rate the hero actually earns experience.
 *
 * Two wrong answers were tried before this one, and both are worth recording because both looked
 * right.
 *
 * The first was to treat the experience track as a clock: subtract currentSeconds from maxSeconds
 * and call the difference a duration. The track is denominated in seconds and advances by exactly
 * `task.durationMs / 1000`, so this reads like an identity. It is not. `transition.ts` advances
 * the track only inside its `task.type === 'kill'` branch — heading to the killing fields, walking
 * to market, selling, buying, and every plot and cinematic task consume time and contribute
 * nothing. Driving the engine at the clock's own cadence for six simulated hours yields 17,403
 * experience-seconds across 21,600 elapsed ones: a ratio of 0.806, so the shortcut runs about 24%
 * short in a consistent direction.
 *
 * The second was to measure the rate against the wall clock. That is right during ordinary play
 * and badly wrong the moment the app credits a closed absence: the catch-up drain replays hours of
 * game time in seconds of real time, and a window that catches it reports a rate an order of
 * magnitude too high. Observed in the browser on a returning session — the panel projected four
 * minutes for a level that was advancing at roughly one percent per minute, an hour's work.
 *
 * So the denominator is `progression.elapsedSeconds`, the game's own clock, which accrues on every
 * completed task. Experience-seconds per elapsed-second is a stable property of the engine's task
 * mix, and it does not care whether those seconds arrived live, in a drain, or side by side with a
 * pause. During ordinary play a game second is a real second, which is what makes the result a
 * duration the player can read.
 */

export interface PromotionSample {
  readonly atMs: number;
  readonly currentSeconds: number;
  readonly maxSeconds: number;
  readonly elapsedSeconds: number;
}

/** Long enough to average over a market trip, short enough to track a change in the task mix. */
export const PROMOTION_WINDOW_MS = 5 * 60_000;

/**
 * Game seconds, not real ones. The window is retained by wall clock so the buffer stays bounded,
 * but the rate is only trustworthy once the game itself has advanced far enough to have covered
 * more than a single long task.
 */
const MINIMUM_ELAPSED_SPAN = 45;

/**
 * Beyond this the figure stops being a projection and becomes a provocation. Levels get expensive
 * quickly, and "expected in 3 years" is a joke the panel would be making at the player's expense
 * rather than the institution's.
 */
export const MAX_PROJECTED_SECONDS = 100 * 60 * 60;

export function retainPromotionWindow(
  samples: readonly PromotionSample[],
  nowMs: number,
): PromotionSample[] {
  const cutoff = nowMs - PROMOTION_WINDOW_MS;
  const kept = samples.filter((sample) => sample.atMs >= cutoff);
  // Keep one sample behind the cutoff so the window never briefly collapses to no span at all.
  const oldest = samples.filter((sample) => sample.atMs < cutoff).at(-1);
  return oldest && kept.length > 0 ? [oldest, ...kept] : kept;
}

/**
 * Seconds of play until the next level at the observed rate, or null when there is nothing honest
 * to say.
 *
 * Null rather than a guess in every ambiguous case. This number's only value is that it can be
 * trusted, and an idle game is watched for hours by someone who will notice when it cannot be.
 */
export function computePromotionEta(samples: readonly PromotionSample[]): number | null {
  if (samples.length < 2) return null;
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;

  // The game's clock, not the wall's. A paused session and a backgrounded tab both simply stop
  // advancing it, which is exactly the behaviour a rate wants from a denominator.
  const elapsed = last.elapsedSeconds - first.elapsedSeconds;
  if (elapsed < MINIMUM_ELAPSED_SPAN) return null;

  // A level-up resets the track to zero, so a window straddling one reads as a loss. Discarding
  // it means the readout is briefly absent after each promotion, which is the correct thing for
  // it to be: the rate across a reset is not a rate.
  const gained = last.currentSeconds - first.currentSeconds;
  if (gained <= 0) return null;

  // Compare against the track the last sample was on. Reading maxSeconds from the first sample
  // would project the old level's requirement onto the new level's progress.
  const remaining = last.maxSeconds - last.currentSeconds;
  if (remaining <= 0) return null;

  const perElapsedSecond = gained / elapsed;
  const projectedSeconds = remaining / perElapsedSecond;
  if (!Number.isFinite(projectedSeconds) || projectedSeconds <= 0) return null;
  if (projectedSeconds > MAX_PROJECTED_SECONDS) return null;

  return Math.round(projectedSeconds);
}
