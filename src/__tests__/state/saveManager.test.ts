// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createNewCharacter } from '../../engine/sim';
import {
  MAX_PQW_INPUT_LENGTH,
  decodePQWSave,
  encodePQWSave,
  loadRoster,
  removeFromRoster,
  saveToRoster,
} from '../../state/saveManager';
import { characterSheetSchema } from '../../state/schemas';

describe('Save Manager & Serialization', () => {
  it('encodes and decodes a character sheet to base64 .pqw format cleanly', () => {
    const originalChar = createNewCharacter('Base64Hero', 'Demicanadian', 'Bastard Lunatic', 9999);
    const encoded = encodePQWSave(originalChar);

    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodePQWSave(encoded);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.Traits.Name).toBe('Base64Hero');
    expect(decoded.value.Traits.Race).toBe('Demicanadian');
    expect(decoded.value.Traits.Class).toBe('Bastard Lunatic');
    expect(decoded.value.Stats.STR).toBe(originalChar.Stats.STR);
  });

  it('returns a typed error for malformed base64', () => {
    expect(decodePQWSave('%%%INVALID_BASE64%%%')).toMatchObject({
      ok: false,
      error: { code: 'malformed_base64' },
    });
  });

  it('returns a typed schema error for incomplete JSON', () => {
    const invalidJson = JSON.stringify({ Traits: { Name: 'Broken' } });
    const encoded = btoa(unescape(encodeURIComponent(invalidJson)));

    expect(decodePQWSave(encoded)).toMatchObject({
      ok: false,
      error: { code: 'invalid_schema' },
    });
  });

  it('rejects oversized input before attempting to decode it', () => {
    expect(decodePQWSave('A'.repeat(MAX_PQW_INPUT_LENGTH + 1))).toMatchObject({
      ok: false,
      error: { code: 'input_too_large' },
    });
  });

  it('rejects syntactically valid saves with unreasonable collection sizes', () => {
    const character = createNewCharacter('Crowded', 'Dung Elf', 'Vermineer', 303);
    character.Inventory = Array.from({ length: 5_001 }, (_, index) => ({ name: `Item ${index}`, qty: 1 }));

    expect(decodePQWSave(encodePQWSave(character))).toMatchObject({
      ok: false,
      error: { code: 'invalid_schema' },
    });
  });

  it('keeps generated character output compatible with the save contract', () => {
    const character = createNewCharacter('ContractHero', 'Half Orc', 'Robot Monk', 404);
    expect(characterSheetSchema.safeParse(character).success).toBe(true);
  });

  it('saves, loads, and removes character sheets from local storage roster', () => {
    const char1 = createNewCharacter('RosterHero1', 'Half Orc', 'Robot Monk', 101);
    const char2 = createNewCharacter('RosterHero2', 'Dung Elf', 'Vermineer', 202);

    saveToRoster(char1);
    saveToRoster(char2);

    const loaded = loadRoster();
    expect(loaded['RosterHero1']).toBeDefined();
    expect(loaded['RosterHero2']).toBeDefined();

    removeFromRoster('RosterHero1');
    const updated = loadRoster();
    expect(updated['RosterHero1']).toBeUndefined();
    expect(updated['RosterHero2']).toBeDefined();
  });

  it('returns a typed failure when browser storage rejects a write', () => {
    const character = createNewCharacter('QuotaHero', 'Half Orc', 'Robot Monk', 505);
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    try {
      expect(saveToRoster(character)).toMatchObject({
        ok: false,
        error: { code: 'storage_failed' },
      });
    } finally {
      setItem.mockRestore();
    }
  });

  it('stores prototype-like character names as ordinary roster keys', () => {
    const character = createNewCharacter('__proto__', 'Half Orc', 'Robot Monk', 505);

    saveToRoster(character);

    const loaded = loadRoster();
    expect(Object.hasOwn(loaded, '__proto__')).toBe(true);
    expect(loaded['__proto__'].Traits.Name).toBe('__proto__');
  });
});
