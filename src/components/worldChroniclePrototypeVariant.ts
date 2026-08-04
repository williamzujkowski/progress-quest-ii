export const CHRONICLE_VARIANTS = ['rail', 'gazette', 'marginalia'] as const;
export type ChronicleVariant = (typeof CHRONICLE_VARIANTS)[number];

export function readChronicleVariant(search = window.location.search): ChronicleVariant {
  const requested = new URLSearchParams(search).get('chronicle');
  return CHRONICLE_VARIANTS.find((variant) => variant === requested) ?? 'rail';
}
