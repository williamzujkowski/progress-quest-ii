import { stableChoice } from '../engine/text';

/**
 * When the simulated guild says anything, decided apart from what it says.
 *
 * The chatter feed reads as an event log with usernames because it is one: measured over thirty
 * simulated minutes, all 435 scenes were triggered by something the hero did, every scene was
 * exactly three lines in the same order, and the rate was 43.5 messages a minute against a target
 * of two to four. A slower version of that is still a caption track. The structural fix is that
 * chat has to exist when nothing has happened, and events have to interrupt it rather than cause it.
 *
 * So the decision splits in two. `projectSocialBatch` keeps deciding what a moment *could* say; this
 * decides whether anyone speaks at all. It has to live outside that function rather than inside it:
 * the projection is called fresh on every 50 ms tick with only that tick's records and no memory of
 * what it emitted a second ago, and its byte-stability test throws if `Math.random` or `Date.now` is
 * touched. Cadence needs exactly the memory and the clock that function is forbidden.
 *
 * Every rule here is a pure function of counters the engine already keeps, so the same save always
 * produces the same channel. Nothing is wired to it yet — landing the rules on their own means they
 * can be argued with before any displayed line depends on them, which is how `magnitude.ts` landed.
 */

/**
 * Gaps in completed tasks between one line and the next, drawn by hash rather than in order.
 *
 * Heavy-tailed on purpose. A channel that speaks every N tasks reads as a machine at any N — it is
 * the evenness that gives it away, not the rate. Real chat is ninety seconds of overlap and then
 * four dead minutes, and the dead minutes are load-bearing: they are what makes the next burst read
 * as people arriving at a topic rather than a timer firing.
 *
 * Two ones and a thirty in the same list is the point. Consecutive short gaps produce the burst,
 * the long tail produces the silence, and the mean lands near six without any gap ever being six.
 */
const TASK_GAPS = [1, 1, 2, 3, 5, 8, 14, 30] as const;

/** How many completed tasks a running bit spends on each of its beats. */
const BEAT_TASKS = 40;

/**
 * The share of ordinary events that get to say anything.
 *
 * One in five, which is the difference between reporting and noticing. The rest are dropped in
 * silence — deliberately without a "12 scenes were consolidated" row, because that row exists to
 * explain a catch-up drain and using it here would announce the suppression instead of performing
 * it.
 */
const ADMITTED_IN = 5;

/**
 * The priority at and above which an event always speaks.
 *
 * Milestones, act completions and level gains sit at 90 and up on the existing ladder. Suppressing
 * one to hit a rate target would be the change a player actually notices, and no cadence rule is
 * worth a silent level-up.
 */
const ALWAYS_ADMITTED_PRIORITY = 90;

/**
 * Whether enough has happened since the last line for anyone to speak again.
 *
 * The gap is redrawn for each attempt from the key rather than fixed, so the interval varies without
 * anything having to remember which interval it chose. Keys should be built from values that change
 * per line — the hero's identity and the task count — so consecutive attempts do not all draw the
 * same gap and freeze the channel.
 */
export function readyToSpeak(completedTasks: number, lastLineTasks: number, key: string): boolean {
  if (!Number.isFinite(completedTasks) || !Number.isFinite(lastLineTasks)) return false;
  // A counter that has gone backwards means a different session's numbers arrived, which is a
  // reason to speak now rather than to wait out a gap measured against a stranger.
  if (completedTasks < lastLineTasks) return true;
  return completedTasks - lastLineTasks >= TASK_GAPS[stableChoice(key, TASK_GAPS.length)]!;
}

/**
 * Whether an ordinary event is one of the few that gets a line.
 *
 * `stableChoice` rather than a modulo of the task count, because a modulo admits every fifth event
 * exactly and the regularity is visible within a minute — the same reason the gaps above are drawn
 * rather than cycled. Two-way and few-way branches in this codebase use `stableChoice` for a
 * documented reason: `stableIndex` decides a length-two choice on the parity of the key's character
 * sum, which once collapsed all four cast seats onto two troupes.
 */
export function admitsEvent(priority: number, key: string): boolean {
  if (priority >= ALWAYS_ADMITTED_PRIORITY) return true;
  return stableChoice(key, ADMITTED_IN) === 0;
}

/**
 * Which beat of a running bit is current.
 *
 * Derived rather than stored. `completedTasks` is monotone, already persisted, and survives a
 * reload, so a feud has a position without anything having to keep one — and it wraps, which is the
 * honest shape: a disagreement about the intake sheet that starts again is truer than one that
 * concludes.
 *
 * Advancing is the caller's problem during a catch-up. A drain replays thousands of tasks in a
 * single tick, so an index taken straight from the counter jumps hundreds of beats and the argument
 * teleports. `clampBeatAdvance` is the fix, and the drain is already detectable at the store seam.
 */
export function beatIndex(completedTasks: number, beats: number): number {
  if (!Number.isSafeInteger(beats) || beats <= 0) throw new RangeError('A running bit needs at least one beat');
  if (!Number.isFinite(completedTasks) || completedTasks < 0) return 0;
  return Math.floor(completedTasks / BEAT_TASKS) % beats;
}

/**
 * The next beat to show, never more than one past the last one shown.
 *
 * Keeps a bit moving at conversation speed through a backlog that moves at drain speed. Wrapping is
 * preserved, so the step from the final beat back to the first is still a single step rather than a
 * jump the clamp would refuse forever.
 */
export function clampBeatAdvance(previous: number, next: number, beats: number): number {
  if (!Number.isSafeInteger(beats) || beats <= 0) throw new RangeError('A running bit needs at least one beat');
  const from = ((Math.trunc(previous) % beats) + beats) % beats;
  const to = ((Math.trunc(next) % beats) + beats) % beats;
  return to === from ? from : (from + 1) % beats;
}
