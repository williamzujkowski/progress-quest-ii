// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { applyTheme, getTerminalThemeVariables, getThemeColor } from '../theme';

/**
 * applyTheme is the only function in the theme module that mutates the document, and it had no
 * unit coverage in either layer: theme.test.ts runs without a DOM and covers its building blocks,
 * while e2e/theme-boot.spec.ts passed in full with the boot script deleted — so the one
 * place this ran was not holding it either.
 *
 * The switching cases are the ones worth having. Applying a theme to a clean root is the easy
 * path; what breaks is the leftovers, because progros deliberately owns its colours from the
 * stylesheet and only gets them if the inline overrides a previous theme wrote are cleared first.
 */

const root = () => document.documentElement;

// The slot names come from the module rather than being spelled out again here. Restating the
// camelCase-to-kebab rule would mean a typo in the test reads as "no slots are set", which is the
// answer the progros case is looking for — it would pass by getting the question wrong.
const COLOUR_SLOTS = Object.keys(getTerminalThemeVariables('remarque-dark'));

const inlineColourSlots = () => COLOUR_SLOTS.filter((slot) => root().style.getPropertyValue(slot) !== '');

beforeEach(() => {
  root().removeAttribute('style');
  delete root().dataset.theme;
  delete root().dataset.terminalTheme;
  document.head.innerHTML = '<meta name="theme-color" content="#000000" />';
});

describe('applyTheme', () => {
  it('marks the root and writes every colour slot for a terminal theme', () => {
    applyTheme(root(), 'remarque-dark');

    expect(root().dataset.theme).toBe('remarque-dark');
    expect(root().dataset.terminalTheme).toBe('remarque-dark');

    // Every variable the palette defines, not a sample: a partial write leaves the page mixing
    // two themes, which is the failure the boot script exists to prevent.
    for (const [property, value] of Object.entries(getTerminalThemeVariables('remarque-dark'))) {
      expect(root().style.getPropertyValue(property), `${property} was not written`).toBe(value);
    }
  });

  it('repaints the browser chrome to match the theme', () => {
    applyTheme(root(), 'green-phosphor-crt');

    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content'))
      .toBe(getThemeColor('green-phosphor-crt'));
  });

  it('strips the inline overrides when progros takes over', () => {
    // The case that actually breaks. progros has no entry in the theme package; its colours come
    // from `[data-theme='progros']` rules, which cannot win against inline custom properties left
    // behind by whichever terminal theme was showing a moment ago.
    applyTheme(root(), 'remarque-light');
    expect(inlineColourSlots().length).toBeGreaterThan(0);

    applyTheme(root(), 'progros');

    expect(root().dataset.theme).toBe('progros');
    expect(root().dataset.terminalTheme).toBeUndefined();
    expect(inlineColourSlots(), 'a terminal palette outlived the switch to progros').toEqual([]);
  });

  it('leaves no trace of the previous palette when switching between terminal themes', () => {
    applyTheme(root(), 'remarque-light');
    applyTheme(root(), 'remarque-dark');

    const light = getTerminalThemeVariables('remarque-light');
    const dark = getTerminalThemeVariables('remarque-dark');
    for (const [property, value] of Object.entries(dark)) {
      expect(root().style.getPropertyValue(property)).toBe(value);
    }
    // Any slot the two palettes disagree on must read as the new one, never the old.
    const disagreed = Object.keys(dark).filter((property) => dark[property] !== light[property]);
    expect(disagreed.length, 'the two palettes are identical, so this proves nothing').toBeGreaterThan(0);
  });

  it('applies the palette even when the document has no theme-color meta tag', () => {
    // Optional chaining guards this; the assertion is that it is a guard and not an accident.
    document.head.innerHTML = '';

    expect(() => applyTheme(root(), 'remarque-dark')).not.toThrow();
    expect(root().dataset.theme).toBe('remarque-dark');
  });
});
