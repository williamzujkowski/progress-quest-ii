// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LogFeed } from '../../components/LogFeed';
import { useGameStore } from '../../state/gameStore';

const originalState = useGameStore.getState();

afterEach(() => {
  cleanup();
  useGameStore.setState(originalState, true);
});

describe('Activity Log accessibility', () => {
  it('defaults to automated Chatter while retaining a distinct authoritative Activity panel', () => {
    render(<LogFeed />);

    expect(screen.getByRole('heading', { name: 'World Console' })).not.toBeNull();
    expect(screen.getByRole('tablist', { name: 'World Console views' })).not.toBeNull();
    const chatterTab = screen.getByRole('tab', { name: 'Chatter' });
    const activityTab = screen.getByRole('tab', { name: 'Activity' });
    expect(chatterTab.getAttribute('aria-selected')).toBe('true');
    expect(chatterTab.getAttribute('tabindex')).toBe('0');
    expect(activityTab.getAttribute('aria-selected')).toBe('false');
    expect(activityTab.getAttribute('tabindex')).toBe('-1');
    expect(document.getElementById(chatterTab.getAttribute('aria-describedby') ?? '')?.textContent).toContain('Fictional');
    expect(document.getElementById(activityTab.getAttribute('aria-describedby') ?? '')?.textContent).toContain('Authoritative');
    expect(screen.getByRole('tabpanel', { name: 'Chatter' }).hasAttribute('hidden')).toBe(false);
    const activityPanel = document.getElementById(activityTab.getAttribute('aria-controls') ?? '');
    expect(activityPanel?.getAttribute('aria-labelledby')).toBe(activityTab.id);
    expect(activityPanel?.hasAttribute('hidden')).toBe(true);
    expect(screen.getByText('Fictional · automated · zero online')).not.toBeNull();
    expect(screen.getByRole('region', { name: 'Activity Event Log', hidden: true })).not.toBeNull();
  });

  it('uses automatic arrow, Home, and End tab activation with one tab stop', () => {
    render(<LogFeed />);
    const chatterTab = screen.getByRole('tab', { name: 'Chatter' });
    const activityTab = screen.getByRole('tab', { name: 'Activity' });
    chatterTab.focus();

    fireEvent.keyDown(chatterTab, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(activityTab);
    expect(activityTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel', { name: 'Activity' })).not.toBeNull();

    fireEvent.keyDown(activityTab, { key: 'Home' });
    expect(document.activeElement).toBe(chatterTab);
    expect(chatterTab.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(chatterTab, { key: 'End' });
    expect(document.activeElement).toBe(activityTab);
    expect(activityTab.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(activityTab, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(chatterTab);
    expect(chatterTab.getAttribute('aria-selected')).toBe('true');
  });

  it('returns to Chatter after a fresh session and repairs only focus owned by Activity', () => {
    render(<><button type="button">Outside console</button><LogFeed /></>);
    const chatterTab = screen.getByRole('tab', { name: 'Chatter' });
    const activityTab = screen.getByRole('tab', { name: 'Activity' });
    fireEvent.click(activityTab);
    activityTab.focus();

    act(() => useGameStore.getState().startSession({ source: 'creation', name: 'Fresh Tab Oracle', race: 'Double Tenant', klass: 'Incident Paladin', seed: 'fresh-tab' }));
    expect(chatterTab.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(chatterTab);

    fireEvent.click(activityTab);
    const activity = screen.getByRole('region', { name: 'Activity Event Log' });
    activity.focus();
    act(() => useGameStore.getState().startSession({ source: 'creation', name: 'Newer Tab Oracle', race: 'Double Tenant', klass: 'Incident Paladin', seed: 'newer-tab' }));
    expect(document.activeElement).toBe(chatterTab);

    fireEvent.click(activityTab);
    const outside = screen.getByRole('button', { name: 'Outside console' });
    outside.focus();
    act(() => useGameStore.getState().startSession({ source: 'creation', name: 'External Focus Oracle', race: 'Double Tenant', klass: 'Incident Paladin', seed: 'external-focus' }));
    expect(chatterTab.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(outside);
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
    expect(screen.getByText('Fictional world · activity-derived')).not.toBeNull();
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
    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }));

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

  it('keeps canonical announcements and a scrolled-back Activity position while Chatter is selected', () => {
    const initialLog = Array.from({ length: 10 }, (_, index) => ({ id: 9 - index, message: `Event ${10 - index}` }));
    useGameStore.setState({ isPaused: true, log: initialLog, nextActivityId: 10 });
    render(<LogFeed />);
    const activity = screen.getByRole('region', { name: 'Activity Event Log', hidden: true });
    Object.defineProperties(activity, {
      scrollHeight: { configurable: true, value: 300 },
      clientHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, value: 0, writable: true },
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }));
    expect(activity.scrollTop).toBe(300);
    activity.scrollTop = 40;
    fireEvent.scroll(activity);
    fireEvent.click(screen.getByRole('tab', { name: 'Chatter' }));
    screen.getByRole('tab', { name: 'Chatter' }).focus();
    activity.scrollTop = 200;
    fireEvent.scroll(activity);
    activity.scrollTop = 40;

    act(() => useGameStore.setState({ log: [{ id: 10, message: 'Event 11' }, ...initialLog], nextActivityId: 11 }));

    expect(screen.getByRole('status', { name: 'Latest activity' }).textContent).toBe('Event 11');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Chatter' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }));
    expect(activity.scrollTop).toBe(40);
    const jump = screen.getByRole('button', { name: 'Jump to latest activity' });
    fireEvent.click(jump);
    expect(activity.scrollTop).toBe(300);
    expect(document.activeElement).toBe(activity);
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
