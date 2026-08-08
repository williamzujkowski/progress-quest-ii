/**
 * A number the game can keep growing without ever calculating on a large one.
 *
 * The joke this serves is that the figures get bigger because zeros are appended, not because
 * anything was computed. That is also the engineering: a value is carried as a bounded mantissa
 * and a count of decades, and every arithmetic operation happens on the mantissa alone. Nothing in
 * the engine ever handles a number with forty digits in it, and nothing has to reason about what
 * happens when one does.
 *
 * Progress Quest earns this honestly. The original clamps and saturates in several places rather
 * than growing without bound, and this build already saturates the level curve at
 * `Number.MAX_VALUE` instead of returning `Infinity`. A carrier makes escalation deliberate
 * instead of a series of individual defences against overflow.
 *
 * Not wired to anything yet. Landing the arithmetic on its own means the rules can be argued with
 * before any displayed number depends on them.
 */

/**
 * The mantissa is normalised to stay under this, so the largest value the engine ever multiplies is
 * three digits short of the safe-integer boundary. Ten was picked over a hundred or a thousand
 * because it makes the decade count the honest measure of scale: `4.2 × 10^9` reads as the joke it
 * is, and `4200 × 10^6` reads as an accident of representation.
 */
const NORMALISED_CEILING = 10;

export interface Magnitude {
  /** Always `0`, or in `[1, 10)`. */
  readonly mantissa: number;
  /**
   * How many powers of ten have been shed. Negative for values below one — the carrier is built for
   * quantities that grow, but scaling down is a legal operation and a representation that cannot
   * express the result would fail silently rather than loudly.
   */
  readonly decades: number;
}

export const ZERO: Magnitude = { mantissa: 0, decades: 0 };

/**
 * Normalises so that two magnitudes describing the same quantity are the same value.
 *
 * Without this, `{ 12, 0 }` and `{ 1.2, 1 }` are the same number and compare unequal, and every
 * consumer has to remember to normalise before testing anything. Doing it at construction means a
 * `Magnitude` in hand is always canonical.
 */
function normalise(mantissa: number, decades: number): Magnitude {
  if (!Number.isFinite(mantissa) || mantissa <= 0) return ZERO;

  let value = mantissa;
  let scale = decades;
  while (value >= NORMALISED_CEILING) {
    value /= 10;
    scale += 1;
  }
  // Downward too, into negative decades. Stopping at zero would leave a denormal mantissa for any
  // value below one, which breaks the invariant every other function here relies on.
  while (value < 1) {
    value *= 10;
    scale -= 1;
  }
  return { mantissa: value, decades: scale };
}

export function fromNumber(value: number): Magnitude {
  return normalise(value, 0);
}

/**
 * The plain number, where one exists.
 *
 * Returns `null` past the safe-integer range rather than a lossy approximation. A caller that wants
 * to display the value has `formatGameNumber`; a caller that wants to compute with it needs to know
 * the answer no longer fits, and silently handing back a `Number` that has stopped being exact is
 * how a scoreboard starts disagreeing with itself.
 */
export function toNumber(value: Magnitude): number | null {
  if (value.mantissa === 0) return 0;

  const scaled = value.mantissa * 10 ** value.decades;
  if (!Number.isSafeInteger(Math.round(scaled))) return null;

  // Normalising divides by ten repeatedly, and dividing then multiplying by the same power of ten
  // is not lossless in binary floating point: 999999999 came back as 999999999.0000001. The game's
  // quantities are integers, so a result within rounding distance of one is that integer rather
  // than an artefact of how it was carried.
  const rounded = Math.round(scaled);
  return Math.abs(scaled - rounded) <= Math.abs(scaled) * 1e-12 ? rounded : scaled;
}

/** Multiplies by a plain factor, which is the only operation escalation actually needs. */
export function scale(value: Magnitude, factor: number): Magnitude {
  if (!Number.isFinite(factor) || factor <= 0) return ZERO;
  return normalise(value.mantissa * factor, value.decades);
}

export function add(left: Magnitude, right: Magnitude): Magnitude {
  if (left.mantissa === 0) return right;
  if (right.mantissa === 0) return left;

  // Align on the larger, then add. A difference past the mantissa's precision means the smaller
  // term cannot survive the addition — which is the correct answer rather than a rounding artefact,
  // and is why the arithmetic stays cheap however far apart the two are.
  const [big, small] = left.decades >= right.decades ? [left, right] : [right, left];
  const gap = big.decades - small.decades;
  if (gap > 16) return big;
  return normalise(big.mantissa + small.mantissa / 10 ** gap, big.decades);
}

/**
 * Ordering, without materialising either value.
 *
 * Comparing through `toNumber` would return `null` for anything past the safe range and leave the
 * caller unable to sort exactly the values this exists to carry.
 */
export function compare(left: Magnitude, right: Magnitude): number {
  if (left.mantissa === 0 || right.mantissa === 0) return Math.sign(left.mantissa - right.mantissa);
  if (left.decades !== right.decades) return Math.sign(left.decades - right.decades);
  return Math.sign(left.mantissa - right.mantissa);
}
