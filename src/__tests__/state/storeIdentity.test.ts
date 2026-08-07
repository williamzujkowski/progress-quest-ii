import { describe, expect, it } from 'vitest';
import { useGameStore } from '../../state/gameStore';

/**
 * The dashboard's components subscribe to slices of the character rather than the whole thing,
 * and that is only worth doing while those slices actually hold their identity between ticks.
 *
 * `tick()` rebuilds the character object on every 50ms tick because `Task.elapsedMs` advances —
 * that part is real progress, not churn. What matters is that the *other* branches keep their
 * references when nothing in them changed. If a future change starts spreading Stats or
 * Inventory on every tick, the narrow selectors silently stop helping and every panel goes back
 * to re-rendering 20 times a second with nothing new to show. This pins that.
 */

const STABLE_BRANCHES = ['Traits', 'Stats', 'Equip', 'Inventory', 'Spells', 'Quest', 'Plot'] as const;

const churnCounts = (ticks: number) => {
  useGameStore.getState().startSession({
    source: 'creation', name: 'Identity Subject', race: 'Half Daemon', klass: 'Incident Paladin', seed: 909,
  });

  const counts: Record<string, number> = { character: 0, ...Object.fromEntries(STABLE_BRANCHES.map((k) => [k, 0])) };
  let previous = useGameStore.getState();

  for (let tick = 0; tick < ticks; tick += 1) {
    useGameStore.getState().tick(50);
    const next = useGameStore.getState();
    if (next.character !== previous.character) counts.character! += 1;
    for (const branch of STABLE_BRANCHES) {
      if (next.character[branch] !== previous.character[branch]) counts[branch]! += 1;
    }
    previous = next;
  }
  return counts;
};

describe('store identity', () => {
  it('holds every branch except the advancing task steady between completed tasks', () => {
    const ticks = 400;
    const counts = churnCounts(ticks);

    // The character itself is expected to churn every tick: Task.elapsedMs really does move.
    expect(counts.character).toBe(ticks);

    // Everything a non-quest panel renders should change only when a task completes, which is
    // a few times across this window rather than hundreds. The bound is deliberately loose —
    // this guards against a return to per-tick churn, not against a task completing.
    for (const branch of STABLE_BRANCHES) {
      expect(counts[branch], `${branch} changed identity ${counts[branch]} times in ${ticks} ticks`)
        .toBeLessThan(ticks / 10);
    }
  });
});
