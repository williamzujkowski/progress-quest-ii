/**
 * Trimming a series of timestamped samples to a trailing window.
 *
 * Written once because it was written twice. `retainWindow` and `retainTrackWindow` had identical
 * bodies — same cutoff, same filter, same trick below — differing only in the sample type and a
 * constant that is `5 * 60_000` in both places. Two copies of one subtlety is one copy too many:
 * the interesting behaviour here is easy to fix in one and forget in the other.
 */

/** Anything the window can measure: a reading with the moment it was taken. */
export interface TimestampedSample {
  readonly atMs: number;
}

/**
 * The samples inside the window, plus the last one before it.
 *
 * That extra sample is the whole subtlety. A window holding only samples newer than the cutoff has
 * no span at all in the moment its oldest member expires, so every consumer computing a rate over
 * it would see the span collapse and have to special-case the gap. Keeping one sample behind the
 * boundary means the window always spans the cutoff rather than starting at it.
 *
 * Returned empty when nothing is inside the window, even if older samples exist: one sample is a
 * reading, not a trend, and a caller asking for a window is asking about a period rather than a
 * moment.
 */
export function retainWithin<Sample extends TimestampedSample>(
  samples: readonly Sample[],
  nowMs: number,
  windowMs: number,
): Sample[] {
  const cutoff = nowMs - windowMs;
  const kept = samples.filter((sample) => sample.atMs >= cutoff);
  const oldest = samples.filter((sample) => sample.atMs < cutoff).at(-1);
  return oldest && kept.length > 0 ? [oldest, ...kept] : kept;
}
