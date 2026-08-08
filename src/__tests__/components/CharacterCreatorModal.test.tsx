// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CharacterCreatorModal } from '../../components/CharacterCreatorModal';
import { PRIME_STATS } from '../../data/traits';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Rolling changes seven numbers at once and used to say nothing.
 *
 * A screen-reader user pressed "Roll 'Em", six prime stats and the total all changed, and the
 * reader was silent — so they had to navigate back into the grid and re-read seven values after
 * every roll to learn what had happened, in the one part of this app that is genuinely interactive.
 * WCAG 2.2 4.1.3 Status Messages.
 */

const statusText = () => screen.getByRole('status').textContent ?? '';
const shownStats = () =>
  [...document.querySelectorAll('[data-testid="creator-prime-stats"] strong')].map((node) => node.textContent);

describe('character creator announces what a roll produced', () => {
  it('says nothing until the player rolls', () => {
    // Opening the dialogue must not announce a result nobody asked for.
    render(<CharacterCreatorModal isOpen onClose={() => {}} />);
    expect(statusText()).toBe('');
  });

  it('announces the total and every stat, matching what is on screen', () => {
    render(<CharacterCreatorModal isOpen onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Roll 'Em/i }));

    const announced = statusText();
    expect(announced).not.toBe('');

    // The announcement has to describe the roll that actually happened, not a stale one — reading
    // the previous stats would be worse than silence.
    const displayed = shownStats();
    expect(displayed).toHaveLength(PRIME_STATS.length);
    PRIME_STATS.forEach((stat, index) => {
      expect(announced).toContain(`${stat} ${displayed[index]}`);
    });

    const total = displayed.reduce((sum, value) => sum + Number(value), 0);
    expect(announced).toContain(`${total} total`);
  });

  it('announces the restored roll when the player takes one back', () => {
    render(<CharacterCreatorModal isOpen onClose={() => {}} />);
    const roll = screen.getByRole('button', { name: /Roll 'Em/i });

    fireEvent.click(roll);
    const first = statusText();
    fireEvent.click(roll);

    const unroll = screen.getByRole('button', { name: /unroll/i });
    fireEvent.click(unroll);

    // Undo changes the same seven numbers, so it owes the same announcement.
    expect(statusText()).not.toBe('');
    expect(statusText()).toContain('Restored');
    expect(statusText()).not.toBe(first);
    PRIME_STATS.forEach((stat, index) => {
      expect(statusText()).toContain(`${stat} ${shownStats()[index]}`);
    });
  });
});
