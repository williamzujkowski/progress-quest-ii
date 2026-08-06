import { describe, expect, it } from 'vitest';
import { computeFilingVelocity, retainWindow, VELOCITY_WINDOW_MS } from '../../state/filingVelocity';

const at = (atMs: number, completedTasks: number) => ({ atMs, completedTasks });

describe('filing velocity', () => {
  it('reports tasks per hour across the sampled span', () => {
    // 30 tasks in 10 minutes is 180/hour.
    expect(computeFilingVelocity([at(0, 100), at(600_000, 130)])).toBe(180);
  });

  it('says nothing until the span is long enough to mean anything', () => {
    expect(computeFilingVelocity([])).toBeNull();
    expect(computeFilingVelocity([at(0, 5)])).toBeNull();
    // A wild first number is worse than no number in a game whose whole surface is figures.
    expect(computeFilingVelocity([at(0, 0), at(5_000, 9)])).toBeNull();
  });

  it('says nothing rather than reporting a negative rate', () => {
    // Restoring a session or starting a new character can move the counter backwards.
    expect(computeFilingVelocity([at(0, 500), at(60_000, 3)])).toBeNull();
  });

  it('reports zero honestly when nothing was filed', () => {
    expect(computeFilingVelocity([at(0, 42), at(120_000, 42)])).toBe(0);
  });

  it('drops samples outside the window but keeps one behind it', () => {
    const now = 10 * 60_000;
    const kept = retainWindow([at(0, 1), at(4 * 60_000, 2), at(9 * 60_000, 3)], now);
    // The 4-minute sample is outside a 5-minute window measured from now, but discarding every
    // stale sample would leave the window with no span each time the oldest one expires.
    expect(kept.map(({ completedTasks }) => completedTasks)).toEqual([2, 3]);
    expect(kept[0]!.atMs).toBeLessThan(now - VELOCITY_WINDOW_MS);
  });

  it('keeps everything while the run is younger than the window', () => {
    const samples = [at(0, 1), at(30_000, 2)];
    expect(retainWindow(samples, 60_000)).toEqual(samples);
  });
});
