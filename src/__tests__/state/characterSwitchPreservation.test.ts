// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { createNewCharacter } from '../../engine/sim';
import { useGameStore } from '../../state/gameStore';
import { loadRoster, saveToRoster } from '../../state/saveManager';

/**
 * Switching characters used to discard everything the outgoing one had earned.
 *
 * All progress since an explicit save lives only in the active checkpoint — the engine's
 * `save_requested` events are log lines and nothing persists on them — so loading another character
 * overwrote it on the next flush. Delete asks for confirmation; this destroyed more and asked
 * nothing.
 */

const originalState = useGameStore.getState();

afterEach(() => {
  localStorage.clear();
  useGameStore.setState(originalState, true);
});

const rosterEntry = (name: string) => {
  const [character] = [createNewCharacter(name, 'Half Daemon', 'Robot Monk', new RandomGenerator(name))];
  return character!;
};

describe('preserving the outgoing character on a switch', () => {
  it('banks the live character before loading another one', () => {
    const marathon = rosterEntry('Marathon');
    expect(saveToRoster(marathon).ok).toBe(true);

    // Establish a real session, then earn progress that exists nowhere on disk.
    useGameStore.getState().startSession({ source: 'roster', character: marathon });
    const advanced = structuredClone(useGameStore.getState().character);
    advanced.Traits = { ...advanced.Traits, Level: 4 };
    advanced.Gold = 77;
    useGameStore.setState({ character: advanced });

    useGameStore.getState().startSession({ source: 'roster', character: rosterEntry('Sidekick') });

    const roster = loadRoster();
    expect(roster.ok).toBe(true);
    // Both halves: the outgoing character kept its progress, and the incoming one is now live.
    expect(roster.ok && roster.value.Marathon?.Traits.Level).toBe(4);
    expect(roster.ok && roster.value.Marathon?.Gold).toBe(77);
    expect(useGameStore.getState().character.Traits.Name).toBe('Sidekick');
  });

  it('does not add a character the player never saved', () => {
    useGameStore.getState().startSession({
      source: 'creation', name: 'Ephemeral', race: 'Half Daemon', klass: 'Robot Monk', seed: 'never-saved',
    });
    useGameStore.getState().startSession({ source: 'roster', character: rosterEntry('Sidekick') });

    const roster = loadRoster();
    expect(roster.ok && Object.keys(roster.value)).toEqual([]);
  });

  it('leaves a saved character alone when the store is still holding the untouched default', () => {
    // The boot path calls startSession while the store holds its hard-coded default, which is named
    // Krg. A player who had saved a character called Krg would otherwise have it replaced by a
    // level-1 stranger on every launch. `sessionGeneration` is zero until a session is established,
    // which is what distinguishes the two.
    const realKrg = rosterEntry('Krg');
    realKrg.Traits = { ...realKrg.Traits, Level: 12 };
    expect(saveToRoster(realKrg).ok).toBe(true);
    expect(useGameStore.getState().character.Traits.Name).toBe('Krg');
    expect(useGameStore.getState().sessionGeneration).toBe(0);

    useGameStore.getState().startSession({ source: 'roster', character: rosterEntry('Someone Else') });

    const roster = loadRoster();
    expect(roster.ok && roster.value.Krg?.Traits.Level).toBe(12);
  });
});
