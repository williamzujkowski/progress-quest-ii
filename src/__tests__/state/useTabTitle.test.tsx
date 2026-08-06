// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { BASE_TITLE } from '../../state/tabTitle';
import { useTabTitle } from '../../state/useTabTitle';

const fakeDocument = (hidden: boolean) => {
  const listeners = new Set<EventListener>();
  return {
    title: 'Original Title',
    hidden,
    addEventListener: (_type: string, listener: EventListener) => { listeners.add(listener); },
    removeEventListener: (_type: string, listener: EventListener) => { listeners.delete(listener); },
    fire: () => { for (const listener of listeners) listener(new Event('visibilitychange')); },
    listenerCount: () => listeners.size,
  };
};

const Probe: React.FC<{ target: ReturnType<typeof fakeDocument> }> = ({ target }) => {
  useTabTitle({ velocity: 100, documentTarget: target as never });
  return null;
};

describe('tab title rotation', () => {
  it('leaves a visible tab alone', () => {
    const target = fakeDocument(false);
    render(<Probe target={target} />);
    // A focused tab already shows the dashboard; renaming it would be noise where the player looks.
    expect(target.title).toBe('Original Title');
  });

  it('rotates only while hidden and restores on return', () => {
    vi.useFakeTimers();
    const target = fakeDocument(true);
    render(<Probe target={target} />);
    expect(target.title).not.toBe('Original Title');
    expect(target.title).toContain(BASE_TITLE);

    const first = target.title;
    vi.advanceTimersByTime(4_000);
    const second = target.title;
    expect(second).toContain(BASE_TITLE);
    expect(second).not.toBe(first);

    target.hidden = false;
    target.fire();
    expect(target.title).toBe('Original Title');
    vi.useRealTimers();
  });

  it('does not thrash between rotations', () => {
    vi.useFakeTimers();
    const target = fakeDocument(true);
    render(<Probe target={target} />);
    const seen = new Set<string>();
    for (let step = 0; step < 8; step += 1) {
      seen.add(target.title);
      vi.advanceTimersByTime(1_000);
    }
    // Eight seconds at a four-second cadence is two rotations, not eight.
    expect(seen.size).toBeLessThanOrEqual(3);
    vi.useRealTimers();
  });

  it('restores the title and detaches its listener on unmount', () => {
    const target = fakeDocument(true);
    const { unmount } = render(<Probe target={target} />);
    unmount();
    expect(target.title).toBe('Original Title');
    expect(target.listenerCount()).toBe(0);
  });
});
