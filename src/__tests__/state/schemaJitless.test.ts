import { describe, expect, it, vi } from 'vitest';

/**
 * Zod must not reach for `new Function` while building this application's schemas.
 *
 * It probes for `eval` support and catches the failure, so validation is unaffected either way —
 * which is exactly why this needs asserting rather than noticing. Under `script-src 'self'` the
 * refused call is a real `securitypolicyviolation` on every page load, and the only person who ever
 * sees it is a developer being offered `'unsafe-eval'` as the fix.
 */

describe('schema construction under a strict policy', () => {
  it('builds every persisted schema without constructing a function', async () => {
    vi.resetModules();
    const RealFunction = globalThis.Function;
    let constructed = 0;
    // A proxy rather than a replacement, so anything that legitimately needs Function still works
    // and only the count is observed.
    globalThis.Function = new Proxy(RealFunction, {
      construct(target, args, newTarget) {
        constructed += 1;
        return Reflect.construct(target, args, newTarget);
      },
      apply(target, thisArg, args) {
        constructed += 1;
        return Reflect.apply(target, thisArg, args);
      },
    }) as FunctionConstructor;

    try {
      const schemas = await import('../../state/schemas');
      // The probe is worthless if the import produced nothing to probe.
      expect(typeof schemas.characterSheetSchema.safeParse).toBe('function');
      expect(constructed).toBe(0);
    } finally {
      globalThis.Function = RealFunction;
    }
  });

  it('still rejects an unknown key, so the interpreted path is doing the work', async () => {
    vi.resetModules();
    const { characterSheetSchema } = await import('../../state/schemas');
    const { createNewCharacter } = await import('../../engine/sim');
    const { RandomGenerator } = await import('../../engine/prng');

    const sheet = createNewCharacter('Jitless', 'Half Daemon', 'Robot Monk', new RandomGenerator('jitless'));
    expect(characterSheetSchema.safeParse(sheet).success).toBe(true);
    expect(characterSheetSchema.safeParse({ ...sheet, Unexpected: 1 }).success).toBe(false);
  });
});
