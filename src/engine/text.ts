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

const SCIENTIFIC_NOTATION_THRESHOLD = 1_000_000;
const MAX_ORDINARY_CHARACTERS = 6;
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
  return Math.abs(value) >= SCIENTIFIC_NOTATION_THRESHOLD || ordinary.length > MAX_ORDINARY_CHARACTERS;
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
  return shouldUseScientificNotation(value, ordinary) ? spokenFormatter.format(value) : ordinary;
}
