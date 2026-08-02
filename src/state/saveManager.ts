import type { CharacterSheet } from '../engine/types';
import { characterSheetSchema } from './schemas';

const ROSTER_STORAGE_KEY = 'progquest_roster_v1';

export function encodePQWSave(sheet: CharacterSheet): string {
  const jsonString = JSON.stringify(sheet);
  const encoded = encodeURIComponent(jsonString);
  return btoa(unescape(encoded));
}

export function decodePQWSave(pqwString: string): CharacterSheet {
  const cleanString = pqwString.replace(/\s/g, '');
  let jsonText: string;

  try {
    jsonText = decodeURIComponent(escape(atob(cleanString)));
  } catch (err) {
    throw new Error('Malformed base64 save string.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error('Save file contains invalid JSON data.');
  }

  const result = characterSheetSchema.safeParse(parsed);
  if (!result.success) {
    const errorDetails = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Invalid Character Sheet Schema: ${errorDetails}`);
  }

  return result.data as CharacterSheet;
}

export function loadRoster(): Record<string, CharacterSheet> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  const raw = window.localStorage.getItem(ROSTER_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    const validRoster: Record<string, CharacterSheet> = {};
    for (const key of Object.keys(parsed)) {
      const check = characterSheetSchema.safeParse(parsed[key]);
      if (check.success) {
        validRoster[key] = check.data as CharacterSheet;
      }
    }
    return validRoster;
  } catch (err) {
    return {};
  }
}

export function saveToRoster(sheet: CharacterSheet): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const roster = loadRoster();
  roster[sheet.Traits.Name] = sheet;
  window.localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster));
}

export function removeFromRoster(characterName: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const roster = loadRoster();
  delete roster[characterName];
  window.localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster));
}
