// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SaveModal } from '../../components/SaveModal';
import { diagnostics } from '../../state/diagnostics';
import { useGameStore } from '../../state/gameStore';

const initialCharacter = useGameStore.getState().character;

afterEach(() => {
  cleanup();
  localStorage.clear();
  useGameStore.setState({ character: initialCharacter });
  vi.restoreAllMocks();
});

describe('Save Manager recovery', () => {
  it('writes only when the player explicitly saves', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<SaveModal isOpen onClose={() => undefined} />);

    act(() => {
      for (let elapsedMs = 1; elapsedMs <= 5; elapsedMs += 1) {
        const character = useGameStore.getState().character;
        useGameStore.setState({ character: { ...character, Task: { ...character.Task, elapsedMs } } });
      }
    });

    expect(setItem.mock.calls.filter(([key]) => key === 'progquest_roster_v1')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Save current character' }));

    await waitFor(() => {
      expect(setItem.mock.calls.filter(([key]) => key === 'progquest_roster_v1')).toHaveLength(1);
    });
    expect(screen.getByRole('status').textContent).toContain('Character saved to this browser.');
  });

  it('keeps a manual save fallback and reports clipboard rejection truthfully', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    vi.stubGlobal('alert', vi.fn());

    try {
      render(<SaveModal isOpen onClose={() => undefined} />);

      const fallback = screen.getByRole('textbox', { name: 'Current save text' }) as HTMLTextAreaElement;
      expect(fallback.readOnly).toBe(true);
      expect(fallback.value.length).toBeGreaterThan(100);
      fireEvent.click(screen.getByRole('button', { name: 'Copy Base64 .pqw Save String' }));

      const failure = await screen.findByRole('alert');
      expect(failure.textContent).toContain('copy it manually');
      expect(screen.queryByText(/copied to clipboard/i)).toBeNull();
      expect(writeText).toHaveBeenCalledWith(fallback.value);
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('announces clipboard success only after the write fulfills', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    try {
      render(<SaveModal isOpen onClose={() => undefined} />);
      fireEvent.click(screen.getByRole('button', { name: 'Copy Base64 .pqw Save String' }));

      const success = await screen.findByRole('status');
      expect(success.textContent).toContain('copied to the clipboard');
      expect(writeText).toHaveBeenCalledOnce();
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('explains manual copying when the Clipboard API is absent', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Reflect.deleteProperty(navigator, 'clipboard');

    try {
      render(<SaveModal isOpen onClose={() => undefined} />);
      fireEvent.click(screen.getByRole('button', { name: 'Copy Base64 .pqw Save String' }));

      const failure = await screen.findByRole('alert');
      expect(failure.textContent).toContain('copy it manually');
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor);
    }
  });

  it('reports corrupt roster data without overwriting it or the active session', async () => {
    const corruptRoster = '{not-json';
    localStorage.setItem('progquest_roster_v1', corruptRoster);
    const activeCharacter = useGameStore.getState().character;
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    render(<SaveModal isOpen onClose={() => undefined} />);

    const failure = await screen.findByRole('alert');
    expect(failure.textContent).toContain('unreadable');
    expect(screen.queryByText('No saved characters found.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save current character' }));
    expect(localStorage.getItem('progquest_roster_v1')).toBe(corruptRoster);
    expect(setItem.mock.calls.filter(([key]) => key === 'progquest_roster_v1')).toHaveLength(0);
    expect(useGameStore.getState().character).toBe(activeCharacter);
    expect(diagnostics.snapshot().at(-1)?.code).toBe('roster_write_failed');
  });
});
