import { z } from 'zod';
import type { CharacterSheet } from '../engine/types';
import { isDOMExceptionNamed } from './diagnostics';
import { characterNameSchema, characterSheetSchema, type PersistedCharacterSheet } from './schemas';

const ROSTER_STORAGE_KEY = 'progquest_roster_v1';
const ROSTER_RECENCY_STORAGE_KEY = 'progquest_roster_recent_v1';
export const MAX_PQW_INPUT_LENGTH = 1_000_000;
export const MAX_ROSTER_ENTRIES = 100;
export const MAX_ROSTER_SERIALIZED_LENGTH = 500_000;
const rosterRecencySchema = z.array(characterNameSchema).max(MAX_ROSTER_ENTRIES);

export type SaveErrorCode =
  | 'input_too_large'
  | 'malformed_base64'
  | 'invalid_json'
  | 'invalid_schema'
  | 'storage_unavailable'
  | 'storage_corrupt'
  | 'storage_full'
  | 'roster_name_taken'
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
  if (isDOMExceptionNamed(error, 'QuotaExceededError')) {
    return saveFailure('storage_full', `Browser storage is full, so it could not ${action}. Nothing was changed.`);
  }
  return saveFailure('storage_failed', `Browser storage could not ${action}. Nothing was changed.`);
}

function recencyWriteFailure(error: unknown, action: string): SaveResult<never> {
  if (isDOMExceptionNamed(error, 'QuotaExceededError')) {
    return saveFailure('storage_full', `The character was ${action}, but browser storage is full and could not update roster recency. Try again after freeing space.`);
  }
  return saveFailure('storage_failed', `The character was ${action}, but browser storage could not update roster recency. Try again.`);
}

function readRosterRecency(storage: Storage, roster: Record<string, CharacterSheet>): SaveResult<string[]> {
  let raw: string | null;
  try {
    raw = storage.getItem(ROSTER_RECENCY_STORAGE_KEY);
  } catch {
    return saveFailure('storage_unavailable', 'Browser storage could not read roster recency. Nothing was changed.');
  }
  if (raw === null) return { ok: true, value: Object.keys(roster) };
  if (raw.length > MAX_ROSTER_SERIALIZED_LENGTH) {
    return saveFailure('storage_corrupt', 'The saved roster recency is too large to process. Nothing was changed.');
  }
  try {
    const parsed = rosterRecencySchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success
      ? { ok: true, value: [...new Set(parsed.data)] }
      : saveFailure('storage_corrupt', 'The saved roster recency is unreadable. Nothing was changed.');
  } catch {
    return saveFailure('storage_corrupt', 'The saved roster recency is unreadable. Nothing was changed.');
  }
}

export function loadRoster(storageOverride?: Storage): SaveResult<Record<string, CharacterSheet>> {
  const storage: SaveResult<Storage> = storageOverride ? { ok: true, value: storageOverride } : getStorage();
  return storage.ok ? readRoster(storage.value) : storage;
}

export function loadMostRecentRosterCharacter(storage?: Storage): SaveResult<CharacterSheet | null> {
  const availableStorage: SaveResult<Storage> = storage ? { ok: true, value: storage } : getStorage();
  if (!availableStorage.ok) return availableStorage;
  const loaded = readRoster(availableStorage.value);
  if (!loaded.ok) return loaded;
  const recency = readRosterRecency(availableStorage.value, loaded.value);
  if (!recency.ok) return recency;
  for (const name of recency.value.toReversed()) {
    const character = loaded.value[name];
    if (Object.hasOwn(loaded.value, name) && character) return { ok: true, value: character };
  }
  return { ok: true, value: Object.values(loaded.value).at(-1) ?? null };
}

/**
 * Adds a character that is not already in the roster.
 *
 * `saveToRoster` replaces by name, which is right for the caller it was written for: saving the
 * character you are playing is meant to overwrite the earlier copy of that same character. It is
 * wrong for an import, where a name collision means two different characters and replacing one
 * destroys progress that cannot be re-earned. The two operations were the same call, so the
 * destructive reading was the default and nothing at the call site said so.
 *
 * Refusing is the whole function. A caller that genuinely wants to replace can still say so by
 * calling `saveToRoster`, but it now has to say it.
 */
export function importToRoster(sheet: CharacterSheet): SaveResult<Record<string, CharacterSheet>> {
  const storage = getStorage();
  if (!storage.ok) return storage;

  const loaded = readRoster(storage.value);
  if (!loaded.ok) return loaded;

  // Own-property only: a character named `constructor` must not read as already present.
  if (Object.hasOwn(loaded.value, sheet.Traits.Name)) {
    return saveFailure(
      'roster_name_taken',
      `This browser already holds a character called ${sheet.Traits.Name}. Nothing was changed.`,
    );
  }

  return saveToRoster(sheet);
}

export function saveToRoster(sheet: CharacterSheet): SaveResult<Record<string, CharacterSheet>> {
  const candidate = characterSheetSchema.safeParse(sheet);
  if (!candidate.success) {
    return saveFailure('invalid_schema', 'This character has invalid save data and was not saved. Nothing was changed.');
  }
  const storage = getStorage();
  if (!storage.ok) return storage;
  const loaded = readRoster(storage.value);
  if (!loaded.ok) return loaded;
  const recency = readRosterRecency(storage.value, loaded.value);
  if (!recency.ok) return recency;

  try {
    const roster = loaded.value;
    roster[candidate.data.Traits.Name] = candidate.data;
    if (Object.keys(roster).length > MAX_ROSTER_ENTRIES) {
      return saveFailure('roster_too_large', 'The roster already contains the maximum number of characters. Nothing was changed.');
    }
    const serialized = JSON.stringify(roster);
    if (serialized.length > MAX_ROSTER_SERIALIZED_LENGTH) {
      return saveFailure('roster_too_large', 'The roster is too large to save. Nothing was changed.');
    }
    const nextRecency = rosterRecencySchema.safeParse([
      ...recency.value.filter((name) => name !== candidate.data.Traits.Name && Object.hasOwn(roster, name)),
      candidate.data.Traits.Name,
    ]);
    if (!nextRecency.success) return saveFailure('storage_failed', 'Roster recency could not be updated safely. Nothing was changed.');
    const serializedRecency = JSON.stringify(nextRecency.data);
    storage.value.setItem(ROSTER_STORAGE_KEY, serialized);
    try {
      storage.value.setItem(ROSTER_RECENCY_STORAGE_KEY, serializedRecency);
    } catch (error) {
      // ponytail: LocalStorage cannot transact two keys, so expose the accurate partial result for a safe retry.
      return recencyWriteFailure(error, 'saved');
    }
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
  const recency = readRosterRecency(storage.value, loaded.value);
  if (!recency.ok) return recency;

  try {
    const roster = loaded.value;
    delete roster[characterName];
    const serialized = JSON.stringify(roster);
    const nextRecency = rosterRecencySchema.safeParse(recency.value.filter((name) => name !== characterName && Object.hasOwn(roster, name)));
    if (!nextRecency.success) return saveFailure('storage_failed', 'Roster recency could not be updated safely. Nothing was changed.');
    const serializedRecency = JSON.stringify(nextRecency.data);
    storage.value.setItem(ROSTER_STORAGE_KEY, serialized);
    try {
      storage.value.setItem(ROSTER_RECENCY_STORAGE_KEY, serializedRecency);
    } catch (error) {
      // ponytail: LocalStorage cannot transact two keys, so expose the accurate partial result for a safe retry.
      return recencyWriteFailure(error, 'removed');
    }
    return { ok: true, value: roster };
  } catch (error) {
    return writeFailure(error, 'remove this character');
  }
}
