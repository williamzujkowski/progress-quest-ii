import type { TerminalColorTheme } from '@williamzujkowski/oklch-terminal-themes';

// Declared here rather than imported. The package's only exported entry point is its barrel,
// which re-exports convert/classify/schema; those pull culori's entire colour-space graph -
// every space it supports - for what is a list of twenty strings. Nothing in this app converts
// a colour; it reads precomputed .oklchCss values out of static JSON. Importing the barrel cost
// 47.75 kB raw / 17.05 kB gzip of dead code, measured by stubbing the dependency and rebuilding.
// src/__tests__/theme.test.ts asserts this list still matches the package, so it cannot drift
// silently; that test imports the barrel, but tests are not bundled.
export const COLOR_KEYS = [
  'background', 'foreground', 'cursor', 'selection',
  'black', 'red', 'green', 'yellow', 'blue', 'purple', 'cyan', 'white',
  'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
  'brightBlue', 'brightPurple', 'brightCyan', 'brightWhite',
] as const satisfies readonly (keyof TerminalColorTheme['colors'])[];
import greenPhosphorCrt from '@williamzujkowski/oklch-terminal-themes/themes/green-phosphor-crt.json';
import keysOceanSunsetHc from '@williamzujkowski/oklch-terminal-themes/themes/keys-ocean-sunset-hc.json';
import remarqueDark from '@williamzujkowski/oklch-terminal-themes/themes/remarque-dark.json';
import remarqueLight from '@williamzujkowski/oklch-terminal-themes/themes/remarque-light.json';

export const THEME_STORAGE_KEY = 'progquest_theme_v1';

export const THEME_OPTIONS = [
  { id: 'remarque-dark', label: 'Remarque Dark' },
  { id: 'remarque-light', label: 'Remarque Light' },
  { id: 'green-phosphor-crt', label: 'Green Phosphor CRT' },
  { id: 'keys-ocean-sunset-hc', label: 'Ocean Sunset HC' },
  { id: 'progros', label: 'Retro ProgrOS' },
] as const;

export type ThemeId = (typeof THEME_OPTIONS)[number]['id'];
export type ThemeStorageResult<T> = { ok: true; value: T } | { ok: false; error: unknown };

export function readThemePreference(storage?: Pick<Storage, 'getItem'>): ThemeStorageResult<string | null> {
  try {
    return { ok: true, value: (storage ?? window.localStorage).getItem(THEME_STORAGE_KEY) };
  } catch (error) {
    return { ok: false, error };
  }
}

export function writeThemePreference(theme: ThemeId, storage?: Pick<Storage, 'setItem'>): ThemeStorageResult<void> {
  try {
    (storage ?? window.localStorage).setItem(THEME_STORAGE_KEY, theme);
    return { ok: true, value: undefined };
  } catch (error) {
    return { ok: false, error };
  }
}

const terminalThemes: Record<Exclude<ThemeId, 'progros'>, TerminalColorTheme> = {
  'green-phosphor-crt': greenPhosphorCrt as TerminalColorTheme,
  'keys-ocean-sunset-hc': keysOceanSunsetHc as TerminalColorTheme,
  'remarque-dark': remarqueDark as TerminalColorTheme,
  'remarque-light': remarqueLight as TerminalColorTheme,
};

const isThemeId = (value: string | null): value is ThemeId =>
  THEME_OPTIONS.some((theme) => theme.id === value);

export const resolveInitialTheme = (storedTheme: string | null, prefersDark: boolean): ThemeId =>
  isThemeId(storedTheme) ? storedTheme : prefersDark ? 'remarque-dark' : 'remarque-light';

const toCssSlot = (key: (typeof COLOR_KEYS)[number]) =>
  `--terminal-${key.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)}`;

export const getTerminalThemeVariables = (theme: ThemeId): Record<string, string> => {
  if (theme === 'progros') return {};

  const variables = Object.fromEntries(
    COLOR_KEYS.map((key) => [toCssSlot(key), terminalThemes[theme].colors[key].oklchCss]),
  );
  const accent = terminalThemes[theme].accent?.oklchCss;
  return accent ? { ...variables, '--terminal-accent': accent } : variables;
};

export const getThemeColor = (theme: Exclude<ThemeId, 'progros'>): string =>
  terminalThemes[theme].colors.background.hex;

export const applyTheme = (root: HTMLElement, theme: ThemeId) => {
  root.dataset.theme = theme;

  for (const key of COLOR_KEYS) root.style.removeProperty(toCssSlot(key));
  root.style.removeProperty('--terminal-accent');

  if (theme === 'progros') {
    delete root.dataset.terminalTheme;
    const themeColor = getComputedStyle(root).getPropertyValue('--terminal-background').trim();
    root.ownerDocument.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', themeColor);
    return;
  }

  root.dataset.terminalTheme = theme;
  for (const [property, value] of Object.entries(getTerminalThemeVariables(theme))) {
    root.style.setProperty(property, value);
  }
  root.ownerDocument.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', getThemeColor(theme));
};
