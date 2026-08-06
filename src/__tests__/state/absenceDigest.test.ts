import { describe, expect, it } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { createNewCharacter } from '../../engine/sim';
import { levelUpTime } from '../../engine/math';
import { advanceGame } from '../../engine/transition';
import { EMPTY_DIGEST, accumulateDigest, describeDigest, isEmptyDigest } from '../../state/absenceDigest';
import { useGameStore } from '../../state/gameStore';

describe('absence digest', () => {
  it('says nothing when the absence produced nothing', () => {
    // A short absence, or one spent entirely inside a single long task, is a real outcome. A row
    // of zeroes would make an uneventful absence look like a broken one.
    expect(isEmptyDigest(EMPTY_DIGEST)).toBe(true);
    expect(describeDigest(EMPTY_DIGEST)).toBeNull();
  });

  it('counts only what it claims to count', () => {
    const digest = accumulateDigest(EMPTY_DIGEST, [
      { type: 'level_gained', level: 2 },
      { type: 'quest_completed', description: 'a matter' },
      { type: 'gold_received', amount: 40 },
      { type: 'gold_received', amount: 2 },
      { type: 'act_completed', act: 1 },
      { type: 'stat_gained', stat: 'HP Max', amount: 3 },
    ] as never);
    expect(digest).toEqual({ levels: 1, quests: 1, acts: 1, gold: 42 });
  });

  it('names only the things that happened', () => {
    const line = describeDigest({ levels: 2, quests: 0, acts: 0, gold: 300 })!;
    expect(line).toContain('2 levels');
    expect(line).toContain('300 gold');
    expect(line).not.toContain('quest');
    expect(line).not.toContain('act');
    // Singular where singular is meant.
    expect(describeDigest({ levels: 1, quests: 1, acts: 1, gold: 0 })!).toContain('1 level, 1 quest, 1 act');
  });

  it('claims no mechanic the engine does not model', () => {
    const line = describeDigest({ levels: 9, quests: 9, acts: 9, gold: 9 })!;
    expect(line).not.toMatch(/damage|stronger|power|bonus|faster than/i);
  });
});

describe('the digest against a real drain', () => {
  const originalState = useGameStore.getState();

  it('reports once when the backlog finishes, and never during ordinary play', () => {
    useGameStore.setState(originalState, true);
    useGameStore.getState().startSession({
      source: 'creation', name: 'Returner', race: 'Half Orc', klass: 'Ur-Paladin', seed: 5150,
    });

    // Ordinary play: every tick spends its own 50ms, so nothing is ever banked.
    for (let step = 0; step < 200; step += 1) useGameStore.getState().tick(50);
    expect(useGameStore.getState().log.some(({ message }) => message.startsWith('Backlog processed'))).toBe(false);

    // A closed session credits a lump of time, which takes many ticks to work through.
    useGameStore.getState().tick(45 * 60 * 1000);
    expect(useGameStore.getState().pendingElapsedMs).toBeGreaterThan(0);
    for (let guard = 0; guard < 20_000 && useGameStore.getState().pendingElapsedMs > 0; guard += 1) {
      useGameStore.getState().tick(50);
    }

    const digests = useGameStore.getState().log.filter(({ message }) => message.startsWith('Backlog processed'));
    expect(digests).toHaveLength(1);
    expect(digests[0]!.message).toMatch(/The absence produced .+, none of it witnessed\./);

    // And the counting stops: further ordinary play adds no second digest.
    for (let step = 0; step < 200; step += 1) useGameStore.getState().tick(50);
    expect(useGameStore.getState().log.filter(({ message }) => message.startsWith('Backlog processed'))).toHaveLength(1);
    useGameStore.setState(originalState, true);
  });

  it('reports totals that match the drained batch', () => {
    // Counted independently from the same engine, so the assertion is not the implementation
    // restated: a digest that agreed with itself would prove nothing.
    const rng = new RandomGenerator('digest-parity');
    let state = {
      character: createNewCharacter('Parity', 'Half Orc', 'Ur-Paladin', rng),
      progression: { experience: { currentSeconds: 0, maxSeconds: levelUpTime(1) }, completedTasks: 0, elapsedSeconds: 0 },
    };
    let expected = EMPTY_DIGEST;
    for (let step = 0; step < 45 * 60 * 20; step += 1) {
      const result = advanceGame(state, 50, rng);
      state = result.state;
      expected = accumulateDigest(expected, result.records.map(({ event }) => event));
    }
    expect(expected.levels).toBeGreaterThan(0);
    expect(describeDigest(expected)).toContain(`${expected.levels} level`);
  });
});
