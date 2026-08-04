// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ChatterFeed } from '../../components/ChatterFeed';
import type { SocialEntry, SocialChannel } from '../../state/socialProjection';
import { useGameStore } from '../../state/gameStore';

const originalState = useGameStore.getState();

const entry = (id: number, channel: SocialChannel, speaker: 'cast' | 'hero' = 'cast'): SocialEntry => ({
  id: `social:${id}:quest:0`,
  sceneId: `social:${id}:quest`,
  sceneKind: 'quest',
  sourceActivityId: id,
  sourceEventType: 'quest_started',
  channel,
  speaker: speaker === 'hero'
    ? { id: 'hero', kind: 'hero', displayName: 'Hero', role: 'Automatic hero reply', fictional: true, automaticHero: true }
    : { id: `cast-${id}`, kind: 'cast', displayName: `Cast ${id}`, role: 'Quest clerk', fictional: true, automaticHero: false },
  text: `Message ${id}`,
});

afterEach(() => {
  cleanup();
  useGameStore.setState(originalState, true);
});

describe('simulated chatter accessibility', () => {
  it('is a quiet, explicitly fictional plain-text transcript', () => {
    useGameStore.setState({ socialEntries: [entry(3, 'hero', 'hero'), entry(2, 'world'), entry(1, 'guild')] });
    render(<ChatterFeed />);

    const panel = screen.getByRole('region', { name: 'Simulated chatter' });
    const messages = screen.getByRole('region', { name: 'Fictional chatter messages' });
    expect(panel.textContent).toContain('No people are online. Every message is fictional, generated locally, and sent nowhere.');
    expect(messages.getAttribute('aria-live')).toBe('off');
    expect(screen.queryByRole('status')).toBeNull();
    expect([...messages.querySelectorAll('[data-social-id]')].map(({ textContent }) => textContent?.includes('Message'))).toEqual([true, true, true]);
    expect(messages.querySelector('bdi[data-speaker-name][dir="auto"]')?.textContent).toBe('Cast 1');
    expect(screen.getByText('Automatic hero reply')).not.toBeNull();
  });

  it('filters a derived view without mutating the retained transcript', () => {
    useGameStore.setState({ socialEntries: [entry(3, 'hero', 'hero'), entry(2, 'world'), entry(1, 'guild')] });
    render(<ChatterFeed />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Chatter channel' }), { target: { value: 'world' } });

    expect(screen.getByText('Message 2')).not.toBeNull();
    expect(screen.queryByText('Message 1')).toBeNull();
    expect(screen.queryByText('Message 3')).toBeNull();
    expect(useGameStore.getState().socialEntries).toHaveLength(3);
  });

  it('mutes presentation only while entries continue to accumulate', () => {
    useGameStore.setState({ socialEntries: [entry(1, 'guild')] });
    render(<ChatterFeed />);
    const mute = screen.getByRole('button', { name: 'Mute fictional chatter' });

    fireEvent.click(mute);
    expect(mute.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Fictional chatter is muted. The imaginary people remain industrious.')).not.toBeNull();
    expect(screen.queryByText('Message 1')).toBeNull();

    act(() => useGameStore.setState({ socialEntries: [entry(2, 'world'), entry(1, 'guild')] }));
    expect(useGameStore.getState().socialEntries).toHaveLength(2);
    expect(screen.queryByText('Message 2')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Unmute fictional chatter' }));
    expect(screen.getByText('Message 2')).not.toBeNull();
  });

  it('preserves a reader who scrolled back and offers an explicit jump', () => {
    useGameStore.setState({ socialEntries: [entry(1, 'guild')] });
    render(<ChatterFeed />);
    const messages = screen.getByRole('region', { name: 'Fictional chatter messages' });
    Object.defineProperties(messages, {
      scrollHeight: { configurable: true, value: 300 },
      clientHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, value: 40, writable: true },
    });
    fireEvent.scroll(messages);

    act(() => useGameStore.setState({ socialEntries: [entry(2, 'world'), entry(1, 'guild')] }));

    expect(messages.scrollTop).toBe(40);
    const jump = screen.getByRole('button', { name: 'Jump to latest chatter' });
    fireEvent.click(jump);
    expect(messages.scrollTop).toBe(300);
    expect(document.activeElement).toBe(messages);
    expect(screen.queryByRole('button', { name: 'Jump to latest chatter' })).toBeNull();
  });

  it('auto-follows without stealing focus and ignores hidden scroll geometry', () => {
    useGameStore.setState({ socialEntries: [entry(1, 'guild')] });
    const { rerender } = render(<><button type="button">Outside chatter</button><ChatterFeed /></>);
    const outside = screen.getByRole('button', { name: 'Outside chatter' });
    const messages = screen.getByRole('region', { name: 'Fictional chatter messages' });
    Object.defineProperties(messages, {
      scrollHeight: { configurable: true, value: 300 },
      clientHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, value: 40, writable: true },
    });
    fireEvent.scroll(messages);
    rerender(<><button type="button">Outside chatter</button><ChatterFeed active={false} /></>);
    messages.scrollTop = 200;
    fireEvent.scroll(messages);
    messages.scrollTop = 40;
    outside.focus();

    act(() => useGameStore.setState({ socialEntries: [entry(2, 'world'), entry(1, 'guild')] }));
    rerender(<><button type="button">Outside chatter</button><ChatterFeed active /></>);

    expect(messages.scrollTop).toBe(40);
    expect(screen.getByRole('button', { name: 'Jump to latest chatter' })).not.toBeNull();
    expect(document.activeElement).toBe(outside);
  });

  it('follows the latest retained row when its hidden container becomes active', () => {
    useGameStore.setState({ socialEntries: [entry(2, 'world'), entry(1, 'guild')] });
    const { rerender } = render(<ChatterFeed active={false} />);
    const messages = screen.getByRole('region', { name: 'Fictional chatter messages' });
    Object.defineProperties(messages, {
      scrollHeight: { configurable: true, value: 300 },
      clientHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, value: 0, writable: true },
    });

    rerender(<ChatterFeed active />);

    expect(messages.scrollTop).toBe(300);
  });

  it('clears a stale jump affordance when a session reset clears chatter', () => {
    useGameStore.setState({ socialEntries: [entry(1, 'guild')] });
    render(<ChatterFeed />);
    const messages = screen.getByRole('region', { name: 'Fictional chatter messages' });
    Object.defineProperties(messages, {
      scrollHeight: { configurable: true, value: 300 },
      clientHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, value: 40, writable: true },
    });
    fireEvent.scroll(messages);
    expect(screen.getByRole('button', { name: 'Jump to latest chatter' })).not.toBeNull();

    act(() => useGameStore.setState({ socialEntries: [] }));

    expect(screen.queryByRole('button', { name: 'Jump to latest chatter' })).toBeNull();
  });
});
