// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_FINITE_CHARACTER_LEVEL } from '../../engine/math';
import { createNewCharacter } from '../../engine/sim';
import {
  MAX_PQW_INPUT_LENGTH,
  MAX_ROSTER_ENTRIES,
  MAX_ROSTER_SERIALIZED_LENGTH,
  decodePQWSave,
  encodePQWSave,
  loadRoster,
  removeFromRoster,
  saveToRoster,
} from '../../state/saveManager';
import { characterSheetSchema, MAX_CHARACTER_NAME_LENGTH } from '../../state/schemas';
import { useGameStore } from '../../state/gameStore';

afterEach(() => {
  localStorage.clear();
});

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
    expect(decoded.value.Quest).toEqual(originalChar.Quest);
    expect(decoded.value.Plot).toEqual(originalChar.Plot);
  });

  it('preserves Unicode character names with the standards-based UTF-8 codec', () => {
    const originalChar = createNewCharacter('Éowyn 🛡️', 'Demicanadian', 'Bastard Lunatic', 9998);

    const decoded = decodePQWSave(encodePQWSave(originalChar));

    expect(decoded).toMatchObject({ ok: true, value: { Traits: { Name: 'Éowyn 🛡️' } } });
  });

  it('returns a typed error for malformed base64', () => {
    expect(decodePQWSave('%%%INVALID_BASE64%%%')).toMatchObject({
      ok: false,
      error: { code: 'malformed_base64' },
    });
  });

  it('rejects base64 that decodes to malformed UTF-8', () => {
    const malformedUtf8 = btoa(String.fromCharCode(0xc3, 0x28));

    expect(decodePQWSave(malformedUtf8)).toMatchObject({
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

  it('keeps an accepted high-level save loadable with finite runtime progression', () => {
    const character = createNewCharacter('Overflow', 'Dung Elf', 'Vermineer', 304);
    character.Traits.Level = MAX_FINITE_CHARACTER_LEVEL + 1;

    const decoded = decodePQWSave(encodePQWSave(character));
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    useGameStore.getState().startSession({ source: 'import', character: decoded.value });
    expect(useGameStore.getState().progression.experience.maxSeconds).toBe(Number.MAX_VALUE);
  });

  it('keeps generated character output compatible with the save contract', () => {
    const character = createNewCharacter('ContractHero', 'Half Orc', 'Robot Monk', 404);
    expect(characterSheetSchema.safeParse(character).success).toBe(true);
  });

  it('validates explicit fixed and random task loot without accepting blank items', () => {
    const character = createNewCharacter('LootContractHero', 'Half Orc', 'Robot Monk', 405);

    expect(characterSheetSchema.safeParse({
      ...character,
      Task: { ...character.Task, loot: { type: 'random' } },
    }).success).toBe(true);
    expect(characterSheetSchema.safeParse({
      ...character,
      Task: { ...character.Task, loot: { type: 'fixed', item: '' } },
    }).success).toBe(false);
  });

  it('accepts optional typed quest metadata while preserving legacy quest saves', () => {
    const character = createNewCharacter('QuestMetadataHero', 'Half Orc', 'Robot Monk', 406);
    const withMetadata = {
      ...character,
      Quest: {
        ...character.Quest,
        kind: 'exterminate' as const,
        target: 'Swamp Elf|1|lilypad',
        targetIndex: 84,
        history: ['Old quest', character.Quest.description],
      },
    };

    expect(characterSheetSchema.safeParse(withMetadata).success).toBe(true);
    expect(characterSheetSchema.safeParse(character).success).toBe(true);
  });

  it('rejects quest metadata outside the bounded contract', () => {
    const character = createNewCharacter('InvalidQuestMetadata', 'Half Orc', 'Robot Monk', 407);

    expect(characterSheetSchema.safeParse({
      ...character,
      Quest: { ...character.Quest, kind: 'unknown' },
    }).success).toBe(false);
    expect(characterSheetSchema.safeParse({
      ...character,
      Quest: { ...character.Quest, targetIndex: -1 },
    }).success).toBe(false);
    expect(characterSheetSchema.safeParse({
      ...character,
      Quest: { ...character.Quest, target: '' },
    }).success).toBe(false);
  });

  it('saves, loads, and removes character sheets from local storage roster', () => {
    const char1 = createNewCharacter('RosterHero1', 'Half Orc', 'Robot Monk', 101);
    const char2 = createNewCharacter('RosterHero2', 'Dung Elf', 'Vermineer', 202);

    saveToRoster(char1);
    saveToRoster(char2);

    const loaded = loadRoster();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value['RosterHero1']).toBeDefined();
    expect(loaded.value['RosterHero2']).toBeDefined();

    removeFromRoster('RosterHero1');
    const updated = loadRoster();
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.value['RosterHero1']).toBeUndefined();
    expect(updated.value['RosterHero2']).toBeDefined();
  });

  it('rejects a roster with too many entries before validating every sheet', () => {
    const roster = Object.fromEntries(Array.from({ length: MAX_ROSTER_ENTRIES + 1 }, (_, index) => [
      `Hero${index}`,
      createNewCharacter(`Hero${index}`, 'Half Orc', 'Robot Monk', index + 1),
    ]));
    const raw = JSON.stringify(roster);
    expect(raw.length).toBeLessThan(MAX_ROSTER_SERIALIZED_LENGTH);
    localStorage.setItem('progquest_roster_v1', raw);

    expect(loadRoster()).toMatchObject({
      ok: false,
      error: { code: 'storage_corrupt' },
    });
  });

  it('rejects an oversized roster before parsing it', () => {
    const oversized = ' '.repeat(MAX_ROSTER_SERIALIZED_LENGTH + 1);
    localStorage.setItem('progquest_roster_v1', oversized);

    expect(loadRoster()).toMatchObject({
      ok: false,
      error: { code: 'storage_corrupt' },
    });
  });

  it('returns a typed failure when browser storage rejects a write', () => {
    const character = createNewCharacter('QuotaHero', 'Half Orc', 'Robot Monk', 505);
    const existing = createNewCharacter('ExistingQuotaHero', 'Dung Elf', 'Vermineer', 504);
    const originalRoster = JSON.stringify({ ExistingQuotaHero: existing });
    localStorage.setItem('progquest_roster_v1', originalRoster);
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    try {
      expect(saveToRoster(character)).toMatchObject({
        ok: false,
        error: { code: 'storage_full' },
      });
      expect(localStorage.getItem('progquest_roster_v1')).toBe(originalRoster);
    } finally {
      setItem.mockRestore();
    }
  });

  it('returns a typed failure when the browser storage capability is denied', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    if (!descriptor) throw new Error('Expected a configurable localStorage property in jsdom.');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => { throw new DOMException('Denied', 'SecurityError'); },
    });

    try {
      expect(loadRoster()).toMatchObject({
        ok: false,
        error: { code: 'storage_unavailable' },
      });
    } finally {
      Object.defineProperty(window, 'localStorage', descriptor);
    }
  });

  it('distinguishes a denied roster read from corrupt roster data', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new DOMException('Denied', 'SecurityError');
    });

    try {
      expect(loadRoster()).toMatchObject({
        ok: false,
        error: { code: 'storage_unavailable' },
      });
    } finally {
      getItem.mockRestore();
    }
  });

  it('preserves corrupt roster bytes instead of overwriting them', () => {
    const character = createNewCharacter('Preserver', 'Half Orc', 'Robot Monk', 606);
    const corruptRoster = '{not-json';
    localStorage.setItem('progquest_roster_v1', corruptRoster);

    expect(saveToRoster(character)).toMatchObject({
      ok: false,
      error: { code: 'storage_corrupt' },
    });
    expect(localStorage.getItem('progquest_roster_v1')).toBe(corruptRoster);
  });

  it('treats an existing empty roster string as corrupt and preserves it', () => {
    const character = createNewCharacter('EmptyPreserver', 'Half Orc', 'Robot Monk', 607);
    localStorage.setItem('progquest_roster_v1', '');

    expect(saveToRoster(character)).toMatchObject({
      ok: false,
      error: { code: 'storage_corrupt' },
    });
    expect(localStorage.getItem('progquest_roster_v1')).toBe('');
  });

  it('rejects roster entries whose storage key does not match the character name', () => {
    const character = createNewCharacter('ActualName', 'Half Orc', 'Robot Monk', 608);
    const mismatchedRoster = JSON.stringify({ Alias: character });
    localStorage.setItem('progquest_roster_v1', mismatchedRoster);

    expect(loadRoster()).toMatchObject({
      ok: false,
      error: { code: 'storage_corrupt' },
    });
    expect(localStorage.getItem('progquest_roster_v1')).toBe(mismatchedRoster);
  });

  it('rejects and preserves roster entries that fail the character schema', () => {
    const invalidRoster = JSON.stringify({ Broken: { Traits: { Name: 'Broken' } } });
    localStorage.setItem('progquest_roster_v1', invalidRoster);

    expect(loadRoster()).toMatchObject({
      ok: false,
      error: { code: 'storage_corrupt' },
    });
    expect(localStorage.getItem('progquest_roster_v1')).toBe(invalidRoster);
  });

  it('returns a generic typed failure when storage rejects a write for another reason', () => {
    const character = createNewCharacter('WriteFailure', 'Half Orc', 'Robot Monk', 609);
    const existing = createNewCharacter('ExistingWriteHero', 'Dung Elf', 'Vermineer', 608);
    const originalRoster = JSON.stringify({ ExistingWriteHero: existing });
    localStorage.setItem('progquest_roster_v1', originalRoster);
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('Synthetic write failure');
    });

    expect(saveToRoster(character)).toMatchObject({
      ok: false,
      error: { code: 'storage_failed' },
    });
    expect(localStorage.getItem('progquest_roster_v1')).toBe(originalRoster);
    setItem.mockRestore();
  });

  it('preserves the previous roster when deleting fails', () => {
    const existing = createNewCharacter('DeletePreserver', 'Dung Elf', 'Vermineer', 612);
    const originalRoster = JSON.stringify({ DeletePreserver: existing });
    localStorage.setItem('progquest_roster_v1', originalRoster);
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('Synthetic delete failure');
    });

    expect(removeFromRoster('DeletePreserver')).toMatchObject({
      ok: false,
      error: { code: 'storage_failed' },
    });
    expect(localStorage.getItem('progquest_roster_v1')).toBe(originalRoster);
    setItem.mockRestore();
  });

  it('preserves the previous roster when serialization fails', () => {
    const existing = createNewCharacter('Existing', 'Dung Elf', 'Vermineer', 610);
    const incoming = createNewCharacter('Incoming', 'Half Orc', 'Robot Monk', 611);
    const originalRoster = JSON.stringify({ Existing: existing });
    localStorage.setItem('progquest_roster_v1', originalRoster);
    const stringify = vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
      throw new TypeError('Synthetic serialization failure');
    });

    expect(saveToRoster(incoming)).toMatchObject({
      ok: false,
      error: { code: 'storage_failed' },
    });
    expect(localStorage.getItem('progquest_roster_v1')).toBe(originalRoster);
    stringify.mockRestore();
  });

  it('stores prototype-like character names as ordinary roster keys', () => {
    const character = createNewCharacter('__proto__', 'Half Orc', 'Robot Monk', 505);

    saveToRoster(character);

    const loaded = loadRoster();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(Object.hasOwn(loaded.value, '__proto__')).toBe(true);
    expect(loaded.value['__proto__'].Traits.Name).toBe('__proto__');
  });

  it('round-trips and removes constructor as an ordinary own roster key', () => {
    const character = createNewCharacter('constructor', 'Half Orc', 'Robot Monk', 506);

    expect(saveToRoster(character)).toMatchObject({ ok: true });
    expect(Object.hasOwn(JSON.parse(localStorage.getItem('progquest_roster_v1') ?? '{}'), 'constructor')).toBe(true);

    const loaded = loadRoster();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(Object.getPrototypeOf(loaded.value)).toBeNull();
    expect(loaded.value['constructor'].Traits.Name).toBe('constructor');

    expect(removeFromRoster('constructor')).toMatchObject({ ok: true, value: {} });
    expect(Object.hasOwn(JSON.parse(localStorage.getItem('progquest_roster_v1') ?? '{}'), 'constructor')).toBe(false);
  });

  it('replaces an exact duplicate name with the latest complete sheet', () => {
    const first = createNewCharacter('Same Name', 'Half Orc', 'Robot Monk', 507);
    const replacement = createNewCharacter('Same Name', 'Dung Elf', 'Vermineer', 508);

    saveToRoster(first);
    expect(saveToRoster(replacement)).toMatchObject({ ok: true });

    const loaded = loadRoster();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(Object.keys(loaded.value)).toEqual(['Same Name']);
    expect(loaded.value['Same Name']).toEqual(replacement);
  });

  it('keeps names that differ only by case as distinct roster identities', () => {
    saveToRoster(createNewCharacter('Hero', 'Half Orc', 'Robot Monk', 509));
    saveToRoster(createNewCharacter('hero', 'Dung Elf', 'Vermineer', 510));

    const loaded = loadRoster();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(Object.keys(loaded.value)).toEqual(['Hero', 'hero']);
  });

  it('keeps existing object-shaped roster JSON compatible across the next save', () => {
    const legacyOne = createNewCharacter('Existing One', 'Half Orc', 'Robot Monk', 511);
    const legacyTwo = createNewCharacter('Existing Two', 'Dung Elf', 'Vermineer', 512);
    const originalRoster = JSON.stringify({ 'Existing One': legacyOne, 'Existing Two': legacyTwo });
    localStorage.setItem('progquest_roster_v1', originalRoster);

    const loaded = loadRoster();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(Object.getPrototypeOf(loaded.value)).toBeNull();
    expect(localStorage.getItem('progquest_roster_v1')).toBe(originalRoster);

    const next = createNewCharacter('Next Save', 'Half Orc', 'Robot Monk', 513);
    expect(saveToRoster(next)).toMatchObject({ ok: true });
    expect(Object.keys(JSON.parse(localStorage.getItem('progquest_roster_v1') ?? '{}'))).toEqual([
      'Existing One',
      'Existing Two',
      'Next Save',
    ]);
  });

  it('accepts a character name at the persisted length boundary', () => {
    const boundaryName = 'N'.repeat(MAX_CHARACTER_NAME_LENGTH);

    expect(saveToRoster(createNewCharacter(boundaryName, 'Half Orc', 'Robot Monk', 514))).toMatchObject({ ok: true });
    expect(loadRoster()).toMatchObject({ ok: true, value: { [boundaryName]: { Traits: { Name: boundaryName } } } });
  });

  it('rejects an overlength character name without changing existing roster bytes', () => {
    const existing = createNewCharacter('ExistingName', 'Dung Elf', 'Vermineer', 506);
    const originalRoster = JSON.stringify({ ExistingName: existing });
    localStorage.setItem('progquest_roster_v1', originalRoster);

    const overlength = createNewCharacter('N'.repeat(MAX_CHARACTER_NAME_LENGTH + 1), 'Half Orc', 'Robot Monk', 515);

    expect(saveToRoster(overlength)).toMatchObject({
      ok: false,
      error: { code: 'invalid_schema' },
    });
    expect(localStorage.getItem('progquest_roster_v1')).toBe(originalRoster);
  });
});
