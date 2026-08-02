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

export function loadRoster(): Record<string, CharacterSheet> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return emptyRoster();
  }

  try {
    const raw = window.localStorage.getItem(ROSTER_STORAGE_KEY);
    if (!raw) return emptyRoster();

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return emptyRoster();
    }

    const validRoster = emptyRoster();
    for (const [key, value] of Object.entries(parsed)) {
      const check = characterSheetSchema.safeParse(value);
      if (check.success) {
        validRoster[key] = check.data;
      }
    }
    return validRoster;
  } catch {
    return emptyRoster();
  }
}

export function saveToRoster(sheet: CharacterSheet): SaveResult<void> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return saveFailure('storage_unavailable', 'Browser storage is unavailable; the character was not saved.');
  }

  try {
    const roster = loadRoster();
    roster[sheet.Traits.Name] = sheet;
    window.localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster));
    return { ok: true, value: undefined };
  } catch {
    return saveFailure('storage_failed', 'Browser storage could not save this character.');
  }
}

export function removeFromRoster(characterName: string): SaveResult<void> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return saveFailure('storage_unavailable', 'Browser storage is unavailable; the character was not removed.');
  }

  try {
    const roster = loadRoster();
    delete roster[characterName];
    window.localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster));
    return { ok: true, value: undefined };
  } catch {
    return saveFailure('storage_failed', 'Browser storage could not remove this character.');
  }
}
