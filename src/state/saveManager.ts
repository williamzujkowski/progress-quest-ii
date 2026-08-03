import type { CharacterSheet } from '../engine/types';
import { characterNameSchema, characterSheetSchema, type PersistedCharacterSheet } from './schemas';

const ROSTER_STORAGE_KEY = 'progquest_roster_v1';
export const MAX_PQW_INPUT_LENGTH = 1_000_000;
export const MAX_ROSTER_ENTRIES = 100;
export const MAX_ROSTER_SERIALIZED_LENGTH = 500_000;

export type SaveErrorCode =
  | 'input_too_large'
  | 'malformed_base64'
  | 'invalid_json'
  | 'invalid_schema'
  | 'storage_unavailable'
  | 'storage_corrupt'
  | 'storage_full'
  | 'roster_too_large'
  | 'storage_failed';

export type SaveResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: SaveErrorCode; message: string } };

function saveFailure(code: SaveErrorCode, message: string): SaveResult<never> {
  return { ok: false, error: { code, message } };
}

export function encodePQWSave(sheet: CharacterSheet): string {
  const jsonString = JSON.stringify(sheet);
  const bytes = new TextEncoder().encode(jsonString);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function decodePQWSave(pqwString: string): SaveResult<PersistedCharacterSheet> {
  if (pqwString.length > MAX_PQW_INPUT_LENGTH) {
    return saveFailure('input_too_large', 'Save data is too large to import.');
  }
  const cleanString = pqwString.replace(/\s/g, '');

  let jsonText: string;
  try {
    jsonText = decodeBase64Utf8(cleanString);
  } catch {
    return saveFailure('malformed_base64', 'Malformed base64 save string.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return saveFailure('invalid_json', 'Save file contains invalid JSON data.');
  }

  const result = characterSheetSchema.safeParse(parsed);
  if (!result.success) {
    const errorDetails = result.error.issues.map((error) => `${error.path.join('.')}: ${error.message}`).join(', ');
    return saveFailure('invalid_schema', `Invalid Character Sheet Schema: ${errorDetails}`);
  }

  return { ok: true, value: result.data };
}

function emptyRoster(): Record<string, CharacterSheet> {
  // ponytail: a null prototype preserves string-key storage without a Map serialization layer.
  return Object.create(null) as Record<string, CharacterSheet>;
}

function getStorage(): SaveResult<Storage> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return saveFailure('storage_unavailable', 'Browser storage is unavailable. Nothing was changed.');
    }
    return { ok: true, value: window.localStorage };
  } catch {
    return saveFailure('storage_unavailable', 'Browser storage is unavailable. Nothing was changed.');
  }
}

function readRoster(storage: Storage): SaveResult<Record<string, CharacterSheet>> {
  let raw: string | null;
  try {
    raw = storage.getItem(ROSTER_STORAGE_KEY);
  } catch {
    return saveFailure('storage_unavailable', 'Browser storage could not be read. Nothing was changed.');
  }
  if (raw === null) return { ok: true, value: emptyRoster() };
  if (raw.length > MAX_ROSTER_SERIALIZED_LENGTH) {
    return saveFailure('storage_corrupt', 'The saved roster is too large to process. Nothing was changed.');
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return saveFailure('storage_corrupt', 'The saved roster is unreadable. Nothing was changed.');
    }

    const validRoster = emptyRoster();
    for (const [key, value] of Object.entries(parsed)) {
      if (Object.keys(validRoster).length >= MAX_ROSTER_ENTRIES) {
        return saveFailure('storage_corrupt', 'The saved roster has too many characters. Nothing was changed.');
      }
      const check = characterSheetSchema.safeParse(value);
      if (!check.success) return saveFailure('storage_corrupt', 'The saved roster is unreadable. Nothing was changed.');
      if (key !== check.data.Traits.Name) {
        return saveFailure('storage_corrupt', 'The saved roster is unreadable. Nothing was changed.');
      }
      validRoster[key] = check.data;
    }
    return { ok: true, value: validRoster };
  } catch {
    return saveFailure('storage_corrupt', 'The saved roster is unreadable. Nothing was changed.');
  }
}

function writeFailure(error: unknown, action: string): SaveResult<never> {
  try {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      return saveFailure('storage_full', `Browser storage is full, so it could not ${action}. Nothing was changed.`);
    }
  } catch {
    // ponytail: hostile platform errors fall through to the generic safe result.
  }
  return saveFailure('storage_failed', `Browser storage could not ${action}. Nothing was changed.`);
}

export function loadRoster(): SaveResult<Record<string, CharacterSheet>> {
  const storage = getStorage();
  return storage.ok ? readRoster(storage.value) : storage;
}

export function saveToRoster(sheet: CharacterSheet): SaveResult<Record<string, CharacterSheet>> {
  if (!characterNameSchema.safeParse(sheet.Traits.Name).success) {
    return saveFailure('invalid_schema', 'This character has an invalid name and was not saved. Nothing was changed.');
  }
  const storage = getStorage();
  if (!storage.ok) return storage;
  const loaded = readRoster(storage.value);
  if (!loaded.ok) return loaded;

  try {
    const roster = loaded.value;
    roster[sheet.Traits.Name] = sheet;
    if (Object.keys(roster).length > MAX_ROSTER_ENTRIES) {
      return saveFailure('roster_too_large', 'The roster already contains the maximum number of characters. Nothing was changed.');
    }
    const serialized = JSON.stringify(roster);
    if (serialized.length > MAX_ROSTER_SERIALIZED_LENGTH) {
      return saveFailure('roster_too_large', 'The roster is too large to save. Nothing was changed.');
    }
    storage.value.setItem(ROSTER_STORAGE_KEY, serialized);
    return { ok: true, value: roster };
  } catch (error) {
    return writeFailure(error, 'save this character');
  }
}

export function removeFromRoster(characterName: string): SaveResult<Record<string, CharacterSheet>> {
  const storage = getStorage();
  if (!storage.ok) return storage;
  const loaded = readRoster(storage.value);
  if (!loaded.ok) return loaded;

  try {
    const roster = loaded.value;
    delete roster[characterName];
    storage.value.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster));
    return { ok: true, value: roster };
  } catch (error) {
    return writeFailure(error, 'remove this character');
  }
}
