import { describe, expect, it } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { createNewCharacter } from '../../engine/sim';
import { levelUpTime } from '../../engine/math';
import { advanceGame } from '../../engine/transition';
import { TENOR_LABELS, tenorFor, tenorLine } from '../../state/institutionalTenor';
import { projectWorld } from '../../state/worldContext';

describe('institutional tenor', () => {
  it('stays routine through the prologue and the first act', () => {
    // The tier that must dominate. Escalation only reads as escalation against the mundane.
    expect(tenorFor({ act: 0 })).toBe('routine');
    expect(tenorFor({ act: 1 })).toBe('routine');
  });

  it('rises by act, and only ever upward', () => {
    const order = ['routine', 'noted', 'ceremonial', 'mythic'];
    let previous = -1;
    for (let act = 0; act <= 20; act += 1) {
      const rank = order.indexOf(tenorFor({ act }));
      expect(rank).toBeGreaterThanOrEqual(previous);
      previous = rank;
    }
    expect(tenorFor({ act: 20 })).toBe('mythic');
  });

  it('reaches the top tier only where a run has genuinely gone on', () => {
    // A guard against quietly lowering the bar later: if the summit becomes reachable early,
    // the joke stops being earned and this fails rather than silently cheapening.
    expect(tenorFor({ act: 4 })).not.toBe('mythic');
    expect(tenorFor({ act: 11 })).not.toBe('mythic');
    expect(tenorFor({ act: 12 })).toBe('mythic');
  });

  it('holds its line still while the hero does', () => {
    const context = { act: 6, location: 'the Auditable Wilds' };
    expect(tenorLine(context)).toBe(tenorLine(context));
    // And moves when the surroundings do, or it would read as a fixed caption.
    const lines = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f'].map((location) => tenorLine({ act: 6, location })),
    );
    expect(lines.size).toBeGreaterThan(1);
  });

  it('says something different at every tier', () => {
    const acts = [0, 2, 5, 12];
    const lines = acts.map((act) => tenorLine({ act, location: 'the same place' }));
    expect(new Set(lines).size).toBe(acts.length);
  });

  it('names every tier it can produce', () => {
    for (const act of [0, 2, 5, 12]) {
      expect(TENOR_LABELS[tenorFor({ act })]).toBeTruthy();
    }
  });

  it('consumes no randomness, so a run is unchanged by reading it', () => {
    // The engine's continuation is the thing that must not move. Projecting and describing the
    // world between ticks has to leave the generator exactly where it was.
    const rng = new RandomGenerator('tenor-purity');
    let state = {
      character: createNewCharacter('Tenor', 'Half Orc', 'Robot Monk', rng),
      progression: { experience: { currentSeconds: 0, maxSeconds: levelUpTime(1) }, completedTasks: 0, elapsedSeconds: 0 },
    };
    state = advanceGame(state, 5_000, rng).state;

    const before = rng.getState();
    const context = projectWorld({ kind: 'current', state }).context;
    tenorLine(context);
    tenorFor(context);

    expect(rng.getState()).toEqual(before);
  });
});
