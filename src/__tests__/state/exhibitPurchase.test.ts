// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { createNewCharacter } from '../../engine/sim';
import { useGameStore } from '../../state/gameStore';

/**
 * The exhibit is the best thing ever worn in each slot, and equipment arrives two ways: found on a
 * body, or bought at market. The store listened only for the first, so a hero whose best
 * breastplate was purchased had a case with a gap in it — and nothing noticed, because the exhibit
 * tests exercise mergeExhibit directly and never the wiring that decides when to call it.
 */

const originalState = useGameStore.getState();

afterEach(() => {
  useGameStore.setState(originalState, true);
  localStorage.clear();
});

const startBuying = () => {
  const character = createNewCharacter('Market Subject', 'Half Orc', 'Ur-Paladin', 4242);
  character.Gold = 5_000;
  character.Inventory = [];
  character.PendingTasks = undefined;
  character.Task = { description: 'Buying equipment...', durationMs: 1, elapsedMs: 0, type: 'buying' };
  useGameStore.setState({ character, isPaused: false, pendingElapsedMs: 0 });
};

describe('commendation exhibit', () => {
  it('records equipment that was bought, not only equipment that was found', () => {
    startBuying();
    expect(useGameStore.getState().commendations.exhibit).toEqual({});

    useGameStore.getState().tick(50);

    const { character, commendations } = useGameStore.getState();
    // The purchase happened: something is in a slot that was not filled before.
    const purchasedSlot = Object.keys(commendations.exhibit)[0];
    expect(purchasedSlot, 'no purchase reached the exhibit').toBeDefined();
    // And the exhibit remembers the item actually worn, not a placeholder.
    expect(commendations.exhibit[purchasedSlot!]!.name).toBe(character.Equip[purchasedSlot as never]);
  });
});
