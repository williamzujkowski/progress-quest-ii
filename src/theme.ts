import { COLOR_KEYS, type TerminalColorTheme } from '@williamzujkowski/oklch-terminal-themes';
import remarqueDark from '@williamzujkowski/oklch-terminal-themes/themes/remarque-dark.json';
import remarqueLight from '@williamzujkowski/oklch-terminal-themes/themes/remarque-light.json';

export const THEME_STORAGE_KEY = 'progquest_theme_v1';

export const THEME_OPTIONS = [
  { id: 'remarque-dark', label: 'Remarque Dark' },
  { id: 'remarque-light', label: 'Remarque Light' },
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

  return Object.fromEntries(
    COLOR_KEYS.map((key) => [toCssSlot(key), terminalThemes[theme].colors[key].oklchCss]),
  );
};

export const applyTheme = (root: HTMLElement, theme: ThemeId) => {
  root.dataset.theme = theme;

  for (const key of COLOR_KEYS) root.style.removeProperty(toCssSlot(key));

  if (theme === 'progros') {
    delete root.dataset.terminalTheme;
    return;
  }

  root.dataset.terminalTheme = theme;
  for (const [property, value] of Object.entries(getTerminalThemeVariables(theme))) {
    root.style.setProperty(property, value);
  }
};
