// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createNewCharacter } from '../../engine/sim';
import { decodePQWSave, encodePQWSave, loadRoster, removeFromRoster, saveToRoster } from '../../state/saveManager';

describe('Save Manager & Serialization', () => {
  it('encodes and decodes a character sheet to base64 .pqw format cleanly', () => {
    const originalChar = createNewCharacter('Base64Hero', 'Demicanadian', 'Bastard Lunatic', 9999);
    const encoded = encodePQWSave(originalChar);
    
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodePQWSave(encoded);
    expect(decoded.Traits.Name).toBe('Base64Hero');
    expect(decoded.Traits.Race).toBe('Demicanadian');
    expect(decoded.Traits.Class).toBe('Bastard Lunatic');
    expect(decoded.Stats.STR).toBe(originalChar.Stats.STR);
  });

  it('rejects malformed base64 strings with human-readable error', () => {
    expect(() => decodePQWSave('%%%INVALID_BASE64%%%')).toThrow(/Malformed base64/);
  });

  it('rejects invalid JSON payloads with Zod schema validation error', () => {
    // Base64 encoding of invalid object missing required fields
    const invalidJson = JSON.stringify({ Traits: { Name: 'Broken' } });
    const encoded = btoa(unescape(encodeURIComponent(invalidJson)));

    expect(() => decodePQWSave(encoded)).toThrow(/Invalid Character Sheet Schema/);
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
});
