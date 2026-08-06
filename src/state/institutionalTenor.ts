import { stableIndex } from '../engine/text';
import type { WorldContext } from './worldContext';

/**
 * How grandly the institution describes itself, as a function of how long this has been going on.
 *
 * An idle game's only real reward for leaving it open is that something changes while you are not
 * looking. Almost everything here changes by counting up; this changes by degree. The same clerk
 * files the same paperwork all the way through, and the language gradually stops being able to
 * keep a straight face about it.
 *
 * The design constraint is the editorial contract's own: *if every empty slot threatens the
 * universe, the universe becomes ordinary inventory.* Escalation only reads as escalation against
 * a long stretch of the mundane, so the routine tier is deliberately most of what anyone ever
 * sees, and the top tier is placed where a session has to be genuinely long-running to reach it.
 *
 * Derived, never persisted. It reads the world context the projection already computes, holds no
 * authority over anything, and consumes no randomness — so it cannot affect the RNG continuation
 * or save compatibility.
 */

export type InstitutionalTenor = 'routine' | 'noted' | 'ceremonial' | 'mythic';

/** What each tier is called where the interface needs to name it rather than speak in it. */
export const TENOR_LABELS: Record<InstitutionalTenor, string> = {
  routine: 'Routine',
  noted: 'Noted',
  ceremonial: 'Ceremonial',
  mythic: 'Mythic',
};

/**
 * Thresholds are on the act, because the act is the coarsest thing the engine advances and the
 * one a watcher already understands as "how far this has got". Level is deliberately not used:
 * it climbs steadily forever, which would make escalation feel like a clock rather than an event.
 */
const CEREMONIAL_ACT = 5;
const MYTHIC_ACT = 12;

/**
 * The prologue and the first acts are routine however long they take. An hour of play should not
 * promote the paperwork on its own; reaching somewhere should.
 */
const NOTED_ACT = 2;

export function tenorFor(context: Pick<WorldContext, 'act'>): InstitutionalTenor {
  if (context.act >= MYTHIC_ACT) return 'mythic';
  if (context.act >= CEREMONIAL_ACT) return 'ceremonial';
  if (context.act >= NOTED_ACT) return 'noted';
  return 'routine';
}

/**
 * One line per tier, describing the same unchanging activity in progressively less defensible
 * terms. Every line is literally true of a hero who is filing paperwork and killing rats; only
 * the institution's opinion of it moves.
 */
const TENOR_LINES: Record<InstitutionalTenor, readonly string[]> = {
  routine: [
    'Operating within normal parameters. No escalation is warranted.',
    'Caseload nominal. The filing continues at the expected rate.',
    'Nothing about this process has yet required a second signature.',
  ],
  noted: [
    'Sustained output has been noted by a department that does not usually notice.',
    'This file has been moved to a slightly larger cabinet.',
    'Performance is now described internally as "consistent", which is not nothing.',
  ],
  ceremonial: [
    'The process is now conducted with ceremony nobody remembers instituting.',
    'A commemorative plaque has been commissioned and immediately misfiled.',
    'Junior clerks are instructed to stand when this record is retrieved.',
  ],
  mythic: [
    'The paperwork is now older than several of the clerks maintaining it.',
    'This file is cited in other files. None of them explain it.',
    'The archive has stopped asking when this concludes and begun asking whether it began.',
  ],
};

/**
 * The line for a tier, chosen deterministically from the location so it holds still while the
 * hero does, and changes when the surroundings do. `stableIndex` is a pure hash rather than a
 * draw from the generator, which is what keeps this out of the RNG continuation entirely.
 */
export function tenorLine(context: Pick<WorldContext, 'act' | 'location'>): string {
  const tenor = tenorFor(context);
  const lines = TENOR_LINES[tenor];
  return lines[stableIndex(`${tenor}:${context.location}`, lines.length)]!;
}
