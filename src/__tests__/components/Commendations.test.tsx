// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Commendations } from '../../components/Commendations';
import { EMPTY_COMMENDATIONS } from '../../state/commendations';
import { useGameStore } from '../../state/gameStore';

afterEach(cleanup);

describe('commendation panel', () => {
  it('stays away entirely until there is something to file', () => {
    useGameStore.setState({ commendations: EMPTY_COMMENDATIONS });
    const { container } = render(<Commendations />);
    // A row of zeroes reads as a broken panel rather than a young one.
    expect(container.innerHTML).toBe('');
  });

  it('reports each record once there is one', () => {
    useGameStore.setState({
      commendations: { highestLevel: 27, largestSale: 1834, questsCompleted: 9, actsCompleted: 2, exhibit: {} },
    });
    render(<Commendations />);
    expect(screen.getByRole('list', { name: 'Commendation ledger' })).toBeTruthy();
    expect(screen.getByText('Highest level attained')).toBeTruthy();
    expect(screen.getByText('27')).toBeTruthy();
    expect(screen.getByText('1834')).toBeTruthy();
  });

  it('claims no mechanic the engine does not model', () => {
    useGameStore.setState({
      commendations: { highestLevel: 5, largestSale: 10, questsCompleted: 1, actsCompleted: 1, exhibit: {} },
    });
    const { container } = render(<Commendations />);
    expect(container.textContent ?? '').not.toMatch(/damage|dps|healed|bonus|reward|unlock|achievement/i);
  });
});
