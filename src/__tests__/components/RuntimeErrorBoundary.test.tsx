// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuntimeErrorBoundary } from '../../components/RuntimeErrorBoundary';

afterEach(() => {
  localStorage.clear();
});

describe('RuntimeErrorBoundary', () => {
  it('preserves saves and lets a keyboard user retry a failed render', () => {
    localStorage.setItem('progquest_roster_v1', '{"Krg":{"still":"saved"}}');
    let shouldThrow = true;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const UnreliableChild = () => {
      if (shouldThrow) throw new Error('render exploded');
      return <p>Questing resumed.</p>;
    };

    try {
      render(
        <RuntimeErrorBoundary>
          <UnreliableChild />
        </RuntimeErrorBoundary>,
      );

      const heading = screen.getByRole('heading', { name: /quest process encountered an enthusiasm/i });
      expect(document.activeElement).toBe(heading);
      expect(screen.getByRole('button', { name: 'Retry interface' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Download current save' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Download diagnostics' })).toBeTruthy();
      expect(localStorage.getItem('progquest_roster_v1')).toBe('{"Krg":{"still":"saved"}}');

      shouldThrow = false;
      fireEvent.click(screen.getByRole('button', { name: 'Retry interface' }));
      expect(screen.getByText('Questing resumed.')).toBeTruthy();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('names the current project on the recovery screen', () => {
    // This screen shipped "PROGRESS QUEST II RUNTIME RECOVERY" and "PQII_INTERFACE_EXCEPTION"
    // through two renames. It survived because nothing asserted either string, and it is the one
    // surface a player only ever sees when something has already gone wrong.
    //
    // ADR 0005 requires visible identity to change atomically or not at all; this is the assertion
    // that makes that checkable rather than aspirational.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const Exploding = () => { throw new Error('render exploded'); };

    try {
      render(
        <RuntimeErrorBoundary>
          <Exploding />
        </RuntimeErrorBoundary>,
      );

      expect(screen.getByText('PROGRESS QUEST III RUNTIME RECOVERY')).toBeTruthy();
      expect(screen.getByText('*** STOP: PQIII_INTERFACE_EXCEPTION ***')).toBeTruthy();
    } finally {
      consoleError.mockRestore();
    }
  });
});
