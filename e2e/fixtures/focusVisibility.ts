import { expect, type Locator } from '@playwright/test';

/**
 * The single way this suite asserts a focus ring is visible.
 *
 * Every focus check used to read `outline-style`, which computes independently of colour and
 * width. Setting the one outline rule in the application to `outline: 2px solid transparent` makes
 * every ring in the product invisible and leaves all five of those assertions passing — verified by
 * running it. The tests were describing a declaration, not an appearance.
 *
 * So the ring is measured the way a person would see it: it has to be drawn (a style and a real
 * width), it has to be painted (a non-zero alpha), and it has to be distinguishable from what sits
 * behind it. WCAG 2.2 puts non-text contrast at 3:1, which is the threshold used here.
 *
 * Colours are resolved through a canvas rather than parsed. The themes are authored in `oklch`, and
 * `getComputedStyle` hands back exactly what was authored — `Number` cannot read it, and a regex
 * that appears to work on one theme silently fails on another.
 */

const FOCUS_RING_MIN_CONTRAST = 3;

interface FocusRing {
  style: string;
  width: number;
  outline: [number, number, number, number];
  shadow: [number, number, number, number] | null;
  behind: [number, number, number];
}

const readFocusRing = (element: Element): FocusRing => {
  const paint = (colour: string): [number, number, number, number] => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d')!;
    // Cleared rather than pre-filled, so a translucent colour keeps its own alpha instead of
    // being composited against an assumed backdrop.
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = colour;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    return [r!, g!, b!, a! / 255];
  };

  const styles = getComputedStyle(element);

  // The ring is drawn over whatever is actually behind the element, which is rarely the element's
  // own background: most of these controls are transparent and sit on a panel. Walk out until
  // something opaque is found, since compositing against a transparent colour proves nothing.
  let behind: [number, number, number] = [0, 0, 0];
  let node: Element | null = element;
  while (node) {
    const [r, g, b, a] = paint(getComputedStyle(node).backgroundColor);
    if (a > 0.99) {
      behind = [r, g, b];
      break;
    }
    node = node.parentElement;
  }

  // A ring is not always an outline. A two-tone indicator draws its inner band with box-shadow,
  // and measuring only the outline reports such a change as no change at all — which is how an
  // earlier attempt at this looked like it had done nothing. The shadow's colour is whatever
  // precedes its first length, which is the form every ring-shaped shadow takes.
  const shadowColour = styles.boxShadow === 'none' ? null : styles.boxShadow.replace(/\s*[\d.]+px.*$/, '').trim();

  return {
    shadow: shadowColour ? paint(shadowColour) : null,
    style: styles.outlineStyle,
    width: Number.parseFloat(styles.outlineWidth) || 0,
    outline: paint(styles.outlineColor),
    behind,
  };
};

const channel = (value: number) => {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const luminance = ([r, g, b]: [number, number, number]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const contrast = (a: [number, number, number], b: [number, number, number]) => {
  const [x, y] = [luminance(a), luminance(b)];
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Asserts the element carries a focus ring a sighted keyboard user can actually see.
 *
 * `context` names the control in the failure, because these run in loops and "expected 1.02 to be
 * at least 3" on its own does not say which one went dark.
 */
export const expectVisibleFocusRing = async (locator: Locator, context: string): Promise<void> => {
  const ring = await locator.evaluate(readFocusRing);

  expect(ring.style, `${context}: outline-style`).not.toBe('none');
  expect(ring.width, `${context}: outline-width`).toBeGreaterThan(0);
  // The assertion the previous checks were missing entirely.
  expect(ring.outline[3], `${context}: outline-color alpha`).toBeGreaterThan(0);

  // Every band the ring is made of, against the backdrop and against each other. One band that
  // contrasts is enough to locate the control, which is the point of a two-tone indicator: it
  // carries its own contrast so it survives a backdrop the page does not choose.
  const bands: [number, number, number][] = [[ring.outline[0], ring.outline[1], ring.outline[2]]];
  if (ring.shadow && ring.shadow[3] > 0) bands.push([ring.shadow[0], ring.shadow[1], ring.shadow[2]]);

  const candidates = bands.map((band) => contrast(band, ring.behind));
  if (bands.length > 1) candidates.push(contrast(bands[0]!, bands[1]!));
  const ratio = Math.max(...candidates);

  expect(
    ratio,
    `${context}: the strongest edge in the focus ring reached only ${ratio.toFixed(2)}:1`,
  ).toBeGreaterThanOrEqual(FOCUS_RING_MIN_CONTRAST);
};
