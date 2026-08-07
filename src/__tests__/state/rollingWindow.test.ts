import { describe, expect, it } from 'vitest';
import { retainWithin } from '../../state/rollingWindow';

/**
 * The contract the two callers share, asserted where it lives rather than twice over in their
 * suites. filingVelocity and trackProjection keep their own tests for what they compute; these
 * cover the trimming they now both delegate.
 */

const at = (atMs: number) => ({ atMs });

describe('retainWithin', () => {
  it('keeps the samples inside the window', () => {
    const samples = [at(1_000), at(2_000), at(3_000)];
    expect(retainWithin(samples, 3_000, 5_000)).toEqual(samples);
  });

  it('keeps one sample behind the cutoff so the window spans it', () => {
    // The subtlety worth having a test for. Without the straggler the window starts at the cutoff
    // rather than crossing it, so its span collapses to nothing each time the oldest member ages
    // out — and everything downstream is computing a rate over that span.
    const retained = retainWithin([at(0), at(1_000), at(9_000), at(10_000)], 10_000, 5_000);
    expect(retained).toEqual([at(1_000), at(9_000), at(10_000)]);
  });

  it('returns nothing when every sample has aged out', () => {
    // Not "the most recent straggler": one sample is a reading, not a trend, and a caller asking
    // for a window is asking about a period rather than a moment.
    expect(retainWithin([at(0), at(1_000)], 100_000, 5_000)).toEqual([]);
  });

  it('is empty for no samples at all', () => {
    expect(retainWithin([], 10_000, 5_000)).toEqual([]);
  });

  it('carries whatever else the caller stores on a sample', () => {
    // Generic over the sample rather than over `{ atMs }` alone, so neither caller has to widen or
    // re-narrow what it stores.
    const labelled = [{ atMs: 9_000, filed: 7 }, { atMs: 10_000, filed: 9 }];
    expect(retainWithin(labelled, 10_000, 5_000)).toEqual(labelled);
  });
});
