// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ItemTooltip } from '../../components/ItemTooltip';
import { useGameStore } from '../../state/gameStore';

afterEach(cleanup);

/**
 * The data layer's own tests prove that an act changes the provenance vocabulary. They cannot
 * prove the component asks for it: deleting the act argument from the call in ItemTooltip leaves
 * every one of them passing, because they call the data functions directly. This is the test that
 * fails when the feature is correct everywhere except where a reader would see it.
 */
describe('item tooltip reads the act it is describing', () => {
  const describedAt = (act: number): string => {
    cleanup();
    useGameStore.setState((state) => ({ character: { ...state.character, Plot: { ...state.character.Plot, act } } }));
    render(<ItemTooltip kind="inventory" name="Nit Tail" quantity={1}>tail</ItemTooltip>);
    // Focus opens it in every browser; the pointer path is what the component's own
    // one-at-a-time logic is about and is not what this test is checking.
    fireEvent.focus(screen.getByRole('button'));
    return screen.getByRole('tooltip').textContent ?? '';
  };

  it('describes the same object differently once the acts have accumulated', () => {
    const early = describedAt(0);
    const late = describedAt(30);
    expect(early).not.toBe('');
    expect(late).not.toBe(early);
  });

  it('holds still at a fixed act', () => {
    expect(describedAt(30)).toBe(describedAt(30));
  });
});
