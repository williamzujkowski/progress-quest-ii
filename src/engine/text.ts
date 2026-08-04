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

export function formatGameNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) < SCIENTIFIC_NOTATION_THRESHOLD) return String(value);
  return scientificFormatter.format(value).replace('E', 'e');
}

export function describeGameNumber(value: number): string {
  if (!Number.isFinite(value)) return 'unavailable';
  return Math.abs(value) < SCIENTIFIC_NOTATION_THRESHOLD ? String(value) : spokenFormatter.format(value);
}
