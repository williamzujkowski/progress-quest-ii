// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SaveModal } from '../../components/SaveModal';
import { createNewCharacter } from '../../engine/sim';
import { diagnostics } from '../../state/diagnostics';
import { useGameStore } from '../../state/gameStore';
import { encodePQWSave } from '../../state/saveManager';

const initialCharacter = useGameStore.getState().character;

afterEach(() => {
  cleanup();
  localStorage.clear();
  useGameStore.setState({ character: initialCharacter });
  vi.restoreAllMocks();
});

describe('Save Manager recovery', () => {
  it('distinguishes portable character saves from automatic session checkpoints', () => {
    render(<SaveModal isOpen onClose={() => undefined} />);

    expect(screen.getByText(/starts fresh session counters and deterministic continuation/)).toBeTruthy();
  });

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

  it('recovers the roster display when an opening read fails transiently', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new DOMException('Transient denial', 'SecurityError');
    });
    render(<SaveModal isOpen onClose={() => undefined} />);

    await screen.findByText('Saved characters are unavailable. Nothing was changed.');
    fireEvent.click(screen.getByRole('button', { name: 'Save current character' }));

    await waitFor(() => expect(screen.queryByText('Saved characters are unavailable. Nothing was changed.')).toBeNull());
    expect(screen.getByRole('status').textContent).toContain('Character saved to this browser.');
    expect(screen.getByText(initialCharacter.Traits.Name)).toBeTruthy();
    getItem.mockRestore();
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
      expect(diagnostics.snapshot().at(-1)?.code).toBe('clipboard_denied');
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
      expect(failure.textContent).toContain('Clipboard API is unavailable');
      expect(diagnostics.snapshot().at(-1)?.code).toBe('clipboard_unavailable');
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor);
    }
  });

  it('distinguishes an unexpected clipboard failure from permission denial', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = vi.fn().mockRejectedValue(new Error('Synthetic clipboard failure'));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    try {
      render(<SaveModal isOpen onClose={() => undefined} />);
      fireEvent.click(screen.getByRole('button', { name: 'Copy Base64 .pqw Save String' }));

      const failure = await screen.findByRole('alert');
      expect(failure.textContent).toContain('could not be copied');
      expect(failure.textContent).not.toContain('denied');
      expect(diagnostics.snapshot().at(-1)?.code).toBe('clipboard_write_failed');
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('copies a click-time snapshot and disables duplicate copy requests while pending', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    let finishCopy: (() => void) | undefined;
    const writeText = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { finishCopy = resolve; }));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    try {
      render(<SaveModal isOpen onClose={() => undefined} />);
      fireEvent.click(screen.getByRole('button', { name: 'Save current character' }));
      await screen.findByRole('status');
      const staleText = (screen.getByRole('textbox', { name: 'Current save text' }) as HTMLTextAreaElement).value;
      act(() => {
        const character = useGameStore.getState().character;
        useGameStore.setState({ character: { ...character, Task: { ...character.Task, elapsedMs: character.Task.elapsedMs + 1 } } });
      });

      const copyButton = screen.getByRole('button', { name: 'Copy Base64 .pqw Save String' });
      fireEvent.click(copyButton);
      await waitFor(() => expect((copyButton as HTMLButtonElement).disabled).toBe(true));
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(writeText).toHaveBeenCalledOnce();
      const copiedText = writeText.mock.calls[0]?.[0];
      expect(copiedText).not.toBe(staleText);
      expect((screen.getByRole('textbox', { name: 'Current save text' }) as HTMLTextAreaElement).value).toBe(copiedText);

      finishCopy?.();
      await screen.findByRole('status');
      expect((copyButton as HTMLButtonElement).disabled).toBe(false);
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('ignores a stale clipboard settlement after the modal closes and reopens', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    let finishCopy: (() => void) | undefined;
    const writeText = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { finishCopy = resolve; }));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    try {
      const view = render(<SaveModal isOpen onClose={() => undefined} />);
      fireEvent.click(screen.getByRole('button', { name: 'Copy Base64 .pqw Save String' }));
      await waitFor(() => expect((screen.getByRole('button', { name: 'Copying…' }) as HTMLButtonElement).disabled).toBe(true));
      view.rerender(<SaveModal isOpen={false} onClose={() => undefined} />);
      act(() => {
        useGameStore.setState({ character: createNewCharacter('Reopened', 'Dung Elf', 'Vermineer', 613) });
      });
      view.rerender(<SaveModal isOpen onClose={() => undefined} />);
      const reopenedCopy = screen.getByRole('button', { name: 'Copy Base64 .pqw Save String' }) as HTMLButtonElement;
      expect(reopenedCopy.disabled).toBe(false);

      finishCopy?.();
      await act(async () => Promise.resolve());
      expect(screen.queryByRole('status')).toBeNull();
      expect((screen.getByRole('textbox', { name: 'Current save text' }) as HTMLTextAreaElement).value)
        .toBe(encodePQWSave(useGameStore.getState().character));
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('does not replace the active session or roster bytes when importing cannot persist', async () => {
    const existing = createNewCharacter('ExistingImportHero', 'Dung Elf', 'Vermineer', 614);
    const imported = createNewCharacter('RejectedImportHero', 'Half Orc', 'Robot Monk', 615);
    const originalRoster = JSON.stringify({ ExistingImportHero: existing });
    localStorage.setItem('progquest_roster_v1', originalRoster);
    const activeCharacter = useGameStore.getState().character;
    const onClose = vi.fn();
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    render(<SaveModal isOpen onClose={onClose} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Import Save String (.pqw)' }), {
      target: { value: encodePQWSave(imported) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Load Character' }));

    expect((await screen.findByRole('alert')).textContent).toContain('storage is full');
    expect(localStorage.getItem('progquest_roster_v1')).toBe(originalRoster);
    expect(useGameStore.getState().character).toBe(activeCharacter);
    expect(onClose).not.toHaveBeenCalled();
    setItem.mockRestore();
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
