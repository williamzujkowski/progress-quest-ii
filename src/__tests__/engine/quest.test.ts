import { describe, expect, it } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { createNewCharacter, generateDeliverQuest, generateFetchQuest, generatePlacateQuest, generateQuest, generateSeekQuest, generateTaskDescription } from '../../engine/sim';

function stateAfterPicks(seed: string, picks: number) {
  const rng = new RandomGenerator(seed);
  for (let pick = 0; pick < picks; pick += 1) rng.random(1_000);
  return rng.getState();
}

describe('legacy quest generators', () => {
  it.each([
    {
      form: 'passing',
      initialState: [0.8579177698120475, 0.8263699773233384, 0.24956287536770105, 1] as [number, number, number, number],
      expectedTask: {
        description: 'Executing a passing Talking Roadmap Robot Monk...',
        type: 'kill',
        durationMs: 6_000,
        loot: { type: 'random' },
        // The count the engine used, asserted rather than stripped. A single named opponent is
        // one opponent, and the description saying "a passing" agrees with it.
        opponents: 1,
      },
      finalState: [0.44347366294823587, 0.86426544142887, 0.03502870723605156, 1408544],
    },
    {
      form: 'titled',
      initialState: [0.1729756232816726, 0.18765057669952512, 0.41180504229851067, 1] as [number, number, number, number],
      expectedTask: {
        description: 'Executing Mr. Midan the Rounding Error...',
        type: 'kill',
        durationMs: 6_000,
        loot: { type: 'random' },
        opponents: 1,
      },
      finalState: [0.21785219269804657, 0.8072053005453199, 0.47258021542802453, 308334],
    },
  ])('matches the legacy $form named-NPC task and RNG continuation', ({ initialState, expectedTask, finalState }) => {
    const character = createNewCharacter('NPC Oracle', 'Half Daemon', 'Incident Paladin', 'npc-character');
    const rng = new RandomGenerator('npc-vector');
    rng.setState(initialState);

    expect(generateTaskDescription(rng, character)).toEqual(expectedTask);
    expect(rng.getState()).toEqual(finalState);
  });

  it('generates Seek with two RNG picks', () => {
    const rng = new RandomGenerator('seek');
    const quest = generateSeekQuest(rng);

    expect(quest).toEqual({ kind: 'seek', description: 'Seek the Provisional Hearing' });
    expect(rng.getState()).toEqual(stateAfterPicks('seek', 2));
  });

  it('generates Deliver and Fetch with one RNG pick each', () => {
    const deliverRng = new RandomGenerator('deliver');
    const fetchRng = new RandomGenerator('fetch');

    expect(generateDeliverQuest(deliverRng)).toEqual({ kind: 'deliver', description: 'Deliver this dust cap' });
    expect(generateFetchQuest(fetchRng)).toEqual({ kind: 'fetch', description: 'Fetch me an egg timer' });
    expect(deliverRng.getState()).toEqual(stateAfterPicks('deliver', 1));
    expect(fetchRng.getState()).toEqual(stateAfterPicks('fetch', 1));
  });

  it('generates Placate with two monster picks and no kill target', () => {
    const rng = new RandomGenerator('placate');
    const quest = generatePlacateQuest(rng, 1);

    expect(quest).toEqual({ kind: 'placate', description: 'Placate the Swamp Elves' });
    expect('target' in quest).toBe(false);
    expect(rng.getState()).toEqual(stateAfterPicks('placate', 2));
  });

  it('dispatches all five legacy quest branches from one branch-selection pick', () => {
    const outputs = ['dispatch-2', 'dispatch-9', 'dispatch-0', 'dispatch-21', 'dispatch-1'].map((seed) => {
      const rng = new RandomGenerator(seed);
      return [generateQuest(rng, 1), rng.getState()];
    });

    expect(outputs).toEqual([
      [{ kind: 'exterminate', description: 'Exterminate the Piercers', target: 'Piercer|3|tip', targetIndex: 169 }, [0.7386679488699883, 0.1321149712894112, 0.25837940047495067, 1859545]],
      [{ kind: 'seek', description: 'Seek the Precedent Amendment' }, [0.440847976366058, 0.36323591391555965, 0.49511508364230394, 179019]],
      [{ kind: 'deliver', description: 'Deliver this I.O.U.' }, [0.31013343250378966, 0.797919366043061, 0.5409550939220935, 1914968]],
      [{ kind: 'fetch', description: 'Fetch me a sticky note' }, [0.9172258146572858, 0.4534230341669172, 0.2273825639858842, 134543]],
      [{ kind: 'placate', description: 'Placate the Mariliths' }, [0.685977301094681, 0.4743830212391913, 0.5976645925547928, 215245]],
    ]);
  });

  it('ignores invalid exterminate metadata without consuming the quest-target roll', () => {
    const ordinary = createNewCharacter('Oracle', 'Half Daemon', 'Incident Paladin', 'task-character');
    ordinary.Quest = { ...ordinary.Quest, kind: 'exterminate' };
    const invalid = structuredClone(ordinary);
    invalid.Quest = { ...invalid.Quest, target: 'invented|999|nothing', targetIndex: 84 };
    const ordinaryRng = new RandomGenerator('invalid-quest-target');
    const invalidRng = new RandomGenerator('invalid-quest-target');

    expect(generateTaskDescription(invalidRng, invalid)).toEqual(generateTaskDescription(ordinaryRng, ordinary));
    expect(invalidRng.getState()).toEqual(ordinaryRng.getState());
  });
});
