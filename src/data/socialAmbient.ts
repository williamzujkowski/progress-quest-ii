import type { SocialSeat } from './socialCatalog';

/**
 * Chat that is not about the hero.
 *
 * Measured over thirty simulated minutes, all 435 scenes were triggered by something the player
 * did. That is the property that makes the feed read as a caption track rather than a channel: real
 * guild chat is overwhelmingly not about the person reading it, and an event-anchored line only
 * feels like an interruption if there is something for it to interrupt.
 *
 * The lines are grouped by seat and written from that seat's `preoccupation` — attendance, prices,
 * quorum, blame allocation. Those columns were declared on every persona and read by nothing, which
 * made them a standing question about whether the cast was a real contract or decoration. They are
 * the contract; this is what they are for.
 *
 * Register rules held to throughout, and they are as much about restraint as about jokes:
 *
 * - No line explains the line before it. Agreement is the weakest possible second beat.
 * - Roughly a quarter carry no joke at all. "back" and "Kettle." are what make the others
 *   detectable as jokes; a channel where every utterance is a polished aphorism reads as generated
 *   however good each aphorism is.
 * - The paired-modifier construction — "emotionally complete and legally decorative" — is the best
 *   move in this project's kit and is already a fingerprint at its current density. None here.
 * - Nothing describes the institution from outside. The cast acts inside the bureaucracy; it never
 *   characterises it.
 * - Nothing acknowledges an observer, unattended time, or the genre.
 * - No figures. An ambient line citing a number would be asserting state nothing computed.
 */

/** The channels ambient chatter uses. Structurally the subset of `SocialChannel` that fits. */
export type AmbientChannel = 'guild' | 'world' | 'party';

export interface AmbientLine {
  readonly seat: SocialSeat;
  readonly channel: AmbientChannel;
  readonly text: string;
}

/**
 * The hall, the paperwork, and the institution — connected to nothing the hero did.
 *
 * The largest lane on purpose. It is the one that establishes the channel exists independently of
 * the player, which is what the whole redesign turns on.
 */
export const AMBIENT_LINES: readonly AmbientLine[] = [
  // official — attendance, and the scope of things
  { seat: 'official', channel: 'guild', text: 'Attendance is being recorded whether or not anything is being attended.' },
  { seat: 'official', channel: 'guild', text: 'The register now has a column for people who were nearly here.' },
  { seat: 'official', channel: 'guild', text: 'Two apologies for absence arrived from the same person, four hours apart.' },
  { seat: 'official', channel: 'guild', text: 'Scope has been clarified. It is now larger.' },
  { seat: 'official', channel: 'guild', text: 'The form asking why the form was needed has been approved.' },
  { seat: 'official', channel: 'guild', text: 'Minutes of the meeting about the minutes remain outstanding.' },
  { seat: 'official', channel: 'guild', text: 'Noted.' },
  { seat: 'official', channel: 'guild', text: 'Tomorrow’s briefing has moved to yesterday for scheduling reasons.' },

  // logistics — provenance, and prices
  { seat: 'logistics', channel: 'guild', text: 'The cabinet marked Miscellaneous has been reclassified as Miscellaneous.' },
  { seat: 'logistics', channel: 'guild', text: 'Someone has filed a complaint about the filing.' },
  { seat: 'logistics', channel: 'world', text: 'Prices are stable. This is not the same as prices being correct.' },
  { seat: 'logistics', channel: 'guild', text: 'The valuation hat is missing. Valuations continue.' },
  { seat: 'logistics', channel: 'guild', text: 'A crate arrived addressed to the previous quartermaster.' },
  { seat: 'logistics', channel: 'guild', text: 'Nothing in the annexe is stolen. Several things are unexplained.' },
  { seat: 'logistics', channel: 'guild', text: 'Logged.' },
  { seat: 'logistics', channel: 'guild', text: 'There is a form for this. There is not a form for finding the form.' },

  // field — quorum, and routes
  { seat: 'field', channel: 'party', text: 'Muster at the usual hour.' },
  { seat: 'field', channel: 'party', text: 'The usual hour has been usual for some time now.' },
  { seat: 'field', channel: 'party', text: 'The corridor outside the armoury is shorter than the map permits.' },
  { seat: 'field', channel: 'party', text: 'I have found a shortcut. It is a shortcut.' },
  { seat: 'field', channel: 'party', text: 'Readiness is high. Attendance is the outstanding item.' },
  { seat: 'field', channel: 'guild', text: 'The north wall of the hall is now considered decorative.' },
  { seat: 'field', channel: 'party', text: 'back' },
  { seat: 'field', channel: 'party', text: 'afk, kettle' },

  // support — morale, and blame
  { seat: 'support', channel: 'guild', text: 'Morale was surveyed. Three responses, all from the same clipboard.' },
  { seat: 'support', channel: 'guild', text: 'The kettle is under review.' },
  { seat: 'support', channel: 'guild', text: 'Blame for the ceiling has been provisionally assigned to the ceiling.' },
  { seat: 'support', channel: 'guild', text: 'I have been asked to stop describing the ledger as haunted.' },
  { seat: 'support', channel: 'guild', text: 'Payroll has been informed that none of us are paid. Payroll disputes this.' },
  { seat: 'support', channel: 'guild', text: 'Someone laminated the fire exit map. The exit remains unlaminated.' },
  { seat: 'support', channel: 'guild', text: 'Kettle.' },
  { seat: 'support', channel: 'guild', text: 'Received.' },
];

/**
 * The same advertisement, from the same seat, on and on.
 *
 * The one lane where repetition is the joke rather than the failure. A trade channel that varied its
 * spam would be less true, not more — and it converts the corpus's worst measured property into its
 * most authentic one.
 */
export const TRADE_LINES: readonly AmbientLine[] = [
  { seat: 'logistics', channel: 'world', text: 'WTS surplus. Reasonable offers considered. Unreasonable offers considered longer.' },
  { seat: 'logistics', channel: 'world', text: 'WTB anything filed under Miscellaneous. Paying in gold and, if pressed, gratitude.' },
  { seat: 'official', channel: 'world', text: 'Recruiting. We have a hall, a ledger, and one member.' },
  { seat: 'field', channel: 'world', text: 'LF one to carry things. No experience required or, historically, present.' },
  { seat: 'logistics', channel: 'world', text: 'Still selling. The surplus has not improved with age. Neither has the offer.' },
];

/**
 * One to three words, which is the most common utterance in any real channel and was zero per cent
 * of this one.
 *
 * Fixes the word-count distribution structurally rather than by sampling for it: the corpus sat in a
 * tight band around nine words with no tail in either direction, and no amount of rewriting the long
 * lines produces a short one. Mixing chat-isms with clerical monosyllables is the register collision
 * in two words instead of thirty.
 */
export const REACTION_LINES: readonly AmbientLine[] = [
  { seat: 'field', channel: 'guild', text: 'grats' },
  { seat: 'support', channel: 'guild', text: 'gz' },
  { seat: 'official', channel: 'guild', text: 'Noted with concern.' },
  { seat: 'official', channel: 'guild', text: 'Seconded.' },
  { seat: 'logistics', channel: 'guild', text: 'Not my department.' },
  { seat: 'support', channel: 'guild', text: 'Again?' },
  { seat: 'official', channel: 'guild', text: 'Motion carries.' },
  { seat: 'logistics', channel: 'guild', text: 'Circulate it.' },
  { seat: 'support', channel: 'guild', text: 'Abstain.' },
  { seat: 'field', channel: 'party', text: 'wb' },
];

/**
 * A disagreement about the intake sheet, in order, for ever.
 *
 * Beats advance with `completedTasks` and wrap, which is the honest shape — a feud that restarts is
 * truer than one that concludes, and it means the bit rewards watching for an hour without ever
 * needing a payoff. The stakes shrink as the register escalates, which is the whole joke.
 */
export const FEUD_BEATS: readonly AmbientLine[] = [
  { seat: 'logistics', channel: 'guild', text: 'The intake sheet is not optional.' },
  { seat: 'official', channel: 'guild', text: 'The intake sheet is not enforceable.' },
  { seat: 'logistics', channel: 'guild', text: 'I have added a box to the intake sheet.' },
  { seat: 'official', channel: 'guild', text: 'I have not read the new box.' },
  { seat: 'logistics', channel: 'guild', text: 'The box is mandatory.' },
  { seat: 'official', channel: 'guild', text: 'The box is aspirational.' },
  { seat: 'logistics', channel: 'guild', text: 'I have escalated the box.' },
  { seat: 'official', channel: 'guild', text: 'The escalation has been filed in the box.' },
];

/**
 * A question asked into silence, re-asked shorter each time, then filed.
 *
 * Silence becomes content. Nothing ever answers, which is the form working rather than the form
 * failing — and it is the cheapest way to make the channel feel like it has a memory and a future,
 * because something is always outstanding.
 */
export const QUESTION_BEATS: readonly AmbientLine[] = [
  { seat: 'field', channel: 'guild', text: 'Does the guild still own the horse?' },
  { seat: 'field', channel: 'guild', text: 'Raising the horse again.' },
  { seat: 'field', channel: 'guild', text: 'Horse.' },
  { seat: 'field', channel: 'guild', text: 'The horse has been carried forward to the next agenda.' },
  { seat: 'field', channel: 'guild', text: 'The next agenda has been carried forward.' },
];
