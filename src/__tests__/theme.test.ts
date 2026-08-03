import { describe, expect, it } from 'vitest';
import remarqueDark from '@williamzujkowski/oklch-terminal-themes/themes/remarque-dark.json';
import remarqueLight from '@williamzujkowski/oklch-terminal-themes/themes/remarque-light.json';
import {
  getTerminalThemeVariables,
  readThemePreference,
  resolveInitialTheme,
  THEME_STORAGE_KEY,
  writeThemePreference,
} from '../theme';

describe('theme contract', () => {
  it('accepts only supported persisted theme identifiers', () => {
    expect(resolveInitialTheme('remarque-dark', false)).toBe('remarque-dark');
    expect(resolveInitialTheme('remarque-light', true)).toBe('remarque-light');
    expect(resolveInitialTheme('progros', true)).toBe('progros');
    expect(resolveInitialTheme('dracula', true)).toBe('remarque-dark');
    expect(resolveInitialTheme('dracula', false)).toBe('remarque-light');
    expect(THEME_STORAGE_KEY).toBe('progquest_theme_v1');
  });

  it('returns typed outcomes when theme preference storage cannot be read or written', () => {
    const readError = new DOMException('Access denied', 'SecurityError');
    const writeError = new DOMException('Quota exceeded', 'QuotaExceededError');
    const reader: Pick<Storage, 'getItem'> = { getItem: () => { throw readError; } };
    const writer: Pick<Storage, 'setItem'> = { setItem: () => { throw writeError; } };

    expect(readThemePreference(reader)).toEqual({ ok: false, error: readError });
    expect(writeThemePreference('progros', writer)).toEqual({ ok: false, error: writeError });
  });

  it('maps the upstream Remarque palette to terminal CSS variables', () => {
    const variables = getTerminalThemeVariables('remarque-dark');

    expect(variables['--terminal-background']).toMatch(/^oklch\(/);
    expect(variables['--terminal-foreground']).toMatch(/^oklch\(/);
    expect(variables['--terminal-bright-blue']).toMatch(/^oklch\(/);
    expect(Object.keys(variables)).toHaveLength(20);
  });

  it('keeps the local ProgrOS theme free of injected terminal variables', () => {
    expect(getTerminalThemeVariables('progros')).toEqual({});
  });

  it('uses upstream palettes that clear WCAG AAA body text and AA ANSI contrast', () => {
    for (const theme of [remarqueDark, remarqueLight]) {
      expect(theme.contrast.fgOnBg).toBeGreaterThanOrEqual(7);
      expect(theme.contrast.minAnsi).toBeGreaterThanOrEqual(4.5);
      expect(theme.contrast.cursorOnBg).toBeGreaterThanOrEqual(3);
      expect(theme.contrast.selectionContrast).toBeGreaterThanOrEqual(4.5);
    }
  });
});
