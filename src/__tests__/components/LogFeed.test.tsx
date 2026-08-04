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
  it('discloses simulated chatter separately from authoritative activity', () => {
    render(<LogFeed />);

    expect(screen.getByRole('heading', { name: 'Console' })).not.toBeNull();
    const disclosure = screen.getByText(/Automated chatter · zero online · messages unsent/).closest('details');
    expect(disclosure?.hasAttribute('open')).toBe(false);
    expect(screen.getByRole('region', { name: 'Activity Event Log' })).not.toBeNull();
  });

  it('presents compact derived world context without turning it into live activity', () => {
    const state = useGameStore.getState();
    useGameStore.setState({
      isPaused: true,
      character: {
        ...state.character,
        Traits: { ...state.character.Traits, Level: 7 },
        Plot: { act: 2, currentProgress: 0, maxProgress: 100 },
        Task: { description: 'Executing an administrative rat...', durationMs: 1000, elapsedMs: 0, type: 'kill' },
      },
      progression: { ...state.progression, elapsedSeconds: 3671 },
      worldNotices: [
        { id: 'world:42:0', sourceActivityId: 42, kind: 'training', text: 'Training recorded.' },
        { id: 'world:41:0', sourceActivityId: 41, kind: 'arrival', text: 'Arrived under reviewed paperwork.' },
        { id: 'world:40:0', sourceActivityId: 40, kind: 'departure', text: 'Departure recorded.' },
      ],
    });

    render(<LogFeed />);

    const context = screen.getByRole('region', { name: 'Current world context' });
    expect(context.textContent).toContain('LOOK //');
    expect(context.textContent).toContain('Act 2');
    expect(context.textContent).toContain('1:01:11 adventure elapsed');
    expect(context.getAttribute('aria-live')).toBeNull();
    expect(screen.getByText('Fictional world · derived from canonical activity')).not.toBeNull();
    expect(context.querySelector('.world-context-line > span > .sr-only')?.textContent).toContain('1 hour, 1 minute, 11 seconds adventure elapsed');
    expect(context.querySelector('strong .sr-only')?.textContent).toContain('Look:');
    expect(screen.getByText('Arrived under reviewed paperwork.')).not.toBeNull();
    expect([...context.querySelectorAll('.world-context-notices p')].map(({ textContent }) => textContent)).toEqual([
      'Departure recorded.',
      'Arrived under reviewed paperwork.',
      'Training recorded.',
    ]);
  });

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

  it('announces Act zero as the Prologue', () => {
    const state = useGameStore.getState();
    useGameStore.setState({
      isPaused: true,
      character: { ...state.character, Plot: { act: 0, currentProgress: 0, maxProgress: 26 } },
    });

    render(<LogFeed />);

    const spokenContext = screen.getByRole('region', { name: 'Current world context' }).querySelector('.world-context-line > span .sr-only');
    expect(spokenContext?.textContent).toContain('Prologue');
    expect(spokenContext?.textContent).not.toContain('Act 0');
  });
});
