export function plural(value: string): string {
  if (value.endsWith('y')) return `${value.slice(0, -1)}ies`;
  if (value.endsWith('us')) return `${value.slice(0, -2)}i`;
  if (['ch', 'x', 's', 'sh'].some((suffix) => value.endsWith(suffix))) return `${value}es`;
  if (value.endsWith('f')) return `${value.slice(0, -1)}ves`;
  if (value.endsWith('man') || value.endsWith('Man')) return `${value.slice(0, -2)}en`;
  return `${value}s`;
}

export function indefinite(value: string, quantity = 1): string {
  if (quantity !== 1) return `${formatGameNumber(quantity)} ${plural(value)}`;
  const article = 'AEIOUÜaeiouü'.includes(value.charAt(0)) ? 'an' : 'a';
  return `${article} ${value}`;
}

export function definite(value: string, quantity = 1): string {
  return `the ${quantity === 1 ? value : plural(value)}`;
}

export function stableIndex(key: string, length: number): number {
  if (!Number.isSafeInteger(length) || length <= 0) throw new RangeError('Stable index requires a positive safe length');
  let hash = 7;
  for (const character of key) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % length;
}

/**
 * A stable index whose low bits actually vary.
 *
 * `stableIndex` multiplies by 31, which is odd, so its result modulo two depends only on the
 * parity of the key's character-code sum. That is invisible at most lengths and decisive at
 * length two: two keys differing only by a short suffix pick the same option whenever the
 * suffixes share a parity, so choices that should be independent move in lockstep.
 *
 * This adds a final avalanche so the low bits depend on the whole key. Kept separate rather than
 * folded into `stableIndex`, because that function's outputs are baked into the item catalogue,
 * the world bulletins and the legacy fixtures — changing it would rewrite text everywhere to fix
 * a defect in one place.
 */
export function stableChoice(key: string, length: number): number {
  if (!Number.isSafeInteger(length) || length <= 0) throw new RangeError('Stable choice requires a positive safe length');
  let hash = 7;
  for (const character of key) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  // xorshift-multiply finish, so every input bit reaches the bottom of the word.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d) >>> 0;
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b) >>> 0;
  // XOR yields a signed 32-bit value, so this must return to unsigned before the modulo — without
  // it a negative hash produces a negative index and an undefined option, which is how this was
  // caught rather than shipped.
  hash = (hash ^ (hash >>> 16)) >>> 0;
  return hash % length;
}

const SCIENTIFIC_NOTATION_THRESHOLD = 1_000_000;
const MAX_ORDINARY_CHARACTERS = 6;
const MAX_SPOKEN_CHARACTERS = 40;
const ordinaryFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  useGrouping: false,
});
const scientificFormatter = new Intl.NumberFormat('en-US', {
  notation: 'scientific',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});
const spokenFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'long',
  maximumSignificantDigits: 3,
});

function ordinaryGameNumber(value: number): string {
  const formatted = ordinaryFormatter.format(value);
  return formatted === '-0' ? '0' : formatted;
}

function shouldUseScientificNotation(value: number, ordinary: string): boolean {
  return (value !== 0 && Number(ordinary) === 0)
    || Math.abs(value) >= SCIENTIFIC_NOTATION_THRESHOLD
    || ordinary.length > MAX_ORDINARY_CHARACTERS;
}

function describeScientificGameNumber(value: number): string {
  const [mantissa, exponent = '0'] = formatGameNumber(value).split('e');
  const exponentValue = Number(exponent);
  return `${mantissa} times 10 to the ${exponentValue < 0 ? 'negative ' : ''}${Math.abs(exponentValue)}`;
}

export function formatGameNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const ordinary = ordinaryGameNumber(value);
  if (!shouldUseScientificNotation(value, ordinary)) return ordinary;
  return scientificFormatter.format(value).replace('E', 'e');
}

export function describeGameNumber(value: number): string {
  if (!Number.isFinite(value)) return 'unavailable';
  const ordinary = ordinaryGameNumber(value);
  if (!shouldUseScientificNotation(value, ordinary)) return ordinary;
  const spoken = spokenFormatter.format(value);
  return spoken.length <= MAX_SPOKEN_CHARACTERS ? spoken : describeScientificGameNumber(value);
}

/**
 * A duration, at the precision the figure actually supports.
 *
 * Coarse on purpose. These come from projections over a sampled rate, and reporting "4h 12m 37s"
 * would dress a five-minute average up as a stopwatch reading. Two units at most, and seconds
 * only when there is nothing larger to report.
 */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '—';
  const seconds = Math.round(totalSeconds);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainderMinutes = minutes % 60;
  if (hours < 24) return remainderMinutes === 0 ? `${hours}h` : `${hours}h ${remainderMinutes}m`;

  const days = Math.floor(hours / 24);
  const remainderHours = hours % 24;
  return remainderHours === 0 ? `${days}d` : `${days}d ${remainderHours}h`;
}

// ponytail: shared by the social and world projections, which both truncate by code
// point so a surrogate pair is never split in half, at the same shared limit.
export const MAX_TEXT_CODE_POINTS = 180;

export function boundCodePoints(text: string, limit: number): string {
  return Array.from(text).slice(0, limit).join('');
}
