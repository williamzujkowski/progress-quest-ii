import type { CharacterSheet } from '../engine/types';
import { characterSheetSchema, type PersistedCharacterSheet } from './schemas';

const ROSTER_STORAGE_KEY = 'progquest_roster_v1';
export const MAX_PQW_INPUT_LENGTH = 1_000_000;

export type SaveErrorCode =
  | 'input_too_large'
  | 'malformed_base64'
  | 'invalid_json'
  | 'invalid_schema'
  | 'storage_unavailable'
  | 'storage_corrupt'
  | 'storage_full'
  | 'storage_failed';

export type SaveResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: SaveErrorCode; message: string } };

function saveFailure(code: SaveErrorCode, message: string): SaveResult<never> {
  return { ok: false, error: { code, message } };
}

export function encodePQWSave(sheet: CharacterSheet): string {
  const jsonString = JSON.stringify(sheet);
  const encoded = encodeURIComponent(jsonString);
  return btoa(unescape(encoded));
}

export function decodePQWSave(pqwString: string): SaveResult<PersistedCharacterSheet> {
  if (pqwString.length > MAX_PQW_INPUT_LENGTH) {
    return saveFailure('input_too_large', 'Save data is too large to import.');
  }
  const cleanString = pqwString.replace(/\s/g, '');

  let jsonText: string;
  try {
    jsonText = decodeURIComponent(escape(atob(cleanString)));
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
  if (!raw) return { ok: true, value: emptyRoster() };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return saveFailure('storage_corrupt', 'The saved roster is unreadable. Nothing was changed.');
    }

    const validRoster = emptyRoster();
    for (const [key, value] of Object.entries(parsed)) {
      const check = characterSheetSchema.safeParse(value);
      if (!check.success) return saveFailure('storage_corrupt', 'The saved roster is unreadable. Nothing was changed.');
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

export function saveToRoster(sheet: CharacterSheet): SaveResult<void> {
  const storage = getStorage();
  if (!storage.ok) return storage;
  const loaded = readRoster(storage.value);
  if (!loaded.ok) return loaded;

  try {
    const roster = loaded.value;
    roster[sheet.Traits.Name] = sheet;
    storage.value.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster));
    return { ok: true, value: undefined };
  } catch (error) {
    return writeFailure(error, 'save this character');
  }
}

export function removeFromRoster(characterName: string): SaveResult<void> {
  const storage = getStorage();
  if (!storage.ok) return storage;
  const loaded = readRoster(storage.value);
  if (!loaded.ok) return loaded;

  try {
    const roster = loaded.value;
    delete roster[characterName];
    storage.value.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster));
    return { ok: true, value: undefined };
  } catch (error) {
    return writeFailure(error, 'remove this character');
  }
}
