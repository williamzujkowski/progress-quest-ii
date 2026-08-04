// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LogFeed } from '../../components/LogFeed';
import { useGameStore } from '../../state/gameStore';

const originalState = useGameStore.getState();

afterEach(() => {
  cleanup();
  useGameStore.setState(originalState, true);
});

describe('Activity Log accessibility', () => {
  it('retains stable rows at the 50-entry boundary and announces only the newest event', () => {
    const initialLog = Array.from({ length: 50 }, (_, index) => ({
      id: 49 - index,
      message: `Event ${50 - index}`,
    }));
    useGameStore.setState({ isPaused: true, log: initialLog, nextActivityId: 50 });
    render(<LogFeed />);

    const feed = screen.getByRole('region', { name: 'Activity Event Log' });
    const status = screen.getByRole('status', { name: 'Latest activity' });
    const retainedRow = screen.getByText('Event 25').closest('.log-entry');
    expect(feed.getAttribute('aria-live')).toBeNull();
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(status.textContent).toBe('');

    act(() => {
      useGameStore.setState({
        log: [{ id: 50, message: 'Event 51' }, ...initialLog].slice(0, 50),
        nextActivityId: 51,
      });
    });

    expect(screen.queryByText('Event 1')).toBeNull();
    expect(screen.getByText('Event 25').closest('.log-entry')).toBe(retainedRow);
    expect(screen.getAllByText(/^Event \d+$/).filter((element) => element.closest('.log-entry'))).toHaveLength(50);
    expect(status.textContent).toBe('Event 51');
  });
});
