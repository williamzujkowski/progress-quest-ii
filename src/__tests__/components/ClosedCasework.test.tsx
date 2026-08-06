// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ClosedCasework } from '../../components/ClosedCasework';
import { createNewCharacter } from '../../engine/sim';
import { useGameStore } from '../../state/gameStore';

afterEach(cleanup);

const withHistory = (history: string[] | undefined) => {
  const character = createNewCharacter('Archivist', 'Half Orc', 'Robot Monk', 900);
  useGameStore.setState({ character: { ...character, Quest: { ...character.Quest, history: history as string[] } } });
};

describe('closed casework archive', () => {
  it('stays away entirely until a quest has closed', () => {
    withHistory([]);
    const { container } = render(<ClosedCasework />);
    // Same reasoning as the commendation ledger: an empty archive reads as broken, not new.
    expect(container.innerHTML).toBe('');
  });

  it('stays away when the character predates the history field', () => {
    // Older saves restore without it, and the schema leaves it optional rather than inventing one.
    withHistory(undefined);
    const { container } = render(<ClosedCasework />);
    expect(container.innerHTML).toBe('');
  });

  it('lists every stored quest, most recent first', () => {
    withHistory(['Oldest matter', 'Middle matter', 'Newest matter']);
    render(<ClosedCasework />);

    const entries = screen.getByRole('list', { name: 'Closed casework, most recent first' });
    expect([...entries.children].map((entry) => entry.textContent)).toEqual([
      'Newest matter', 'Middle matter', 'Oldest matter',
    ]);
  });

  it('reproduces the engine descriptions verbatim rather than summarising them', () => {
    // The archive interprets nothing. Whatever the engine wrote is what is on file, punctuation
    // and all — including entries the engine happens to repeat.
    const repeated = 'Deliver 3 kobold spleens to the Bursar';
    withHistory([repeated, 'Placate the Duke', repeated]);
    render(<ClosedCasework />);

    expect(screen.getAllByText(repeated)).toHaveLength(2);
    expect(screen.getByText('Placate the Duke')).toBeTruthy();
  });

  it('renders the full stored history without truncating it further', () => {
    // The engine already trims to a hundred when it files a new quest, so the panel does not
    // slice again — a second, quieter cap here would hide records the save still holds.
    withHistory(Array.from({ length: 100 }, (_value, index) => `Matter ${index}`));
    render(<ClosedCasework />);

    const entries = screen.getByRole('list', { name: 'Closed casework, most recent first' });
    expect(entries.children).toHaveLength(100);
    expect(entries.children[0]!.textContent).toBe('Matter 99');
  });
});
