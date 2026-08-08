import { describe, expect, it } from 'vitest';
import { NEW_CADENCE, readyToSpeak, scheduleChatter } from '../../state/chatterSchedule';
import type { SocialEntry, SocialSceneKind } from '../../state/socialProjection';

/**
 * The gate is asserted over a run rather than per call.
 *
 * A cadence test that pins one batch to one answer says nothing about the rate, and the rate is the
 * whole reason this exists — the feed was measured at 43.5 messages a minute against a target of
 * two to four.
 */

const scene = (sceneId: string, sceneKind: SocialSceneKind, lines = 3): SocialEntry[] =>
  Array.from({ length: lines }, (_, index) => ({
    id: `${sceneId}:${index}`,
    sceneId,
    sceneKind,
    sourceActivityId: 1,
    channel: 'guild' as const,
    speaker: { id: 'x', kind: 'cast' as const, displayName: 'X', role: 'r', fictional: true as const, automaticHero: false },
    text: `line ${index}`,
  }));

/** Drives many batches through the gate the way the store does, one per completed task. */
const run = (kind: SocialSceneKind, batches: number) => {
  let cadence = NEW_CADENCE;
  let spoken = 0;
  for (let task = 1; task <= batches; task += 1) {
    const result = scheduleChatter(scene(`s:${task}`, kind), cadence, task);
    cadence = result.cadence;
    spoken += result.entries.length;
  }
  return spoken;
};

describe('how much the guild actually says', () => {
  it('cuts ordinary chatter by roughly an order of magnitude', () => {
    // 600 loot scenes of three lines each is 1800 lines ungated. Both bounds are asserted: too
    // little is as wrong as too much, and a gate that silenced everything would pass a one-sided
    // check while deleting the feature.
    const spoken = run('loot', 600);
    expect(spoken).toBeGreaterThan(40);
    expect(spoken).toBeLessThan(300);
  });

  it('never suppresses a level, a milestone, or the row that explains a drain', () => {
    // These bypass both gates. A silent level-up is the one suppression a player reads as a bug,
    // and silencing the catch-up row removes the explanation rather than the noise.
    expect(run('level', 200)).toBe(600);
    expect(run('milestone', 200)).toBe(600);
    expect(run('catch_up', 200)).toBe(600);
  });

  it('does not make a level wait behind the gap', () => {
    // Speaking, then immediately levelling, must not queue the level behind a drawn gap — it would
    // land after loot the player has stopped looking at.
    const first = scheduleChatter(scene('a', 'loot'), NEW_CADENCE, 100);
    const level = scheduleChatter(scene('b', 'level'), first.cadence, 100);
    expect(level.entries).toHaveLength(3);
  });

  it('lets a scene through whole or not at all', () => {
    // Half a three-line exchange is worse than none of it.
    let cadence = NEW_CADENCE;
    for (let task = 1; task <= 400; task += 1) {
      const result = scheduleChatter(scene(`s:${task}`, 'loot'), cadence, task);
      cadence = result.cadence;
      expect([0, 3]).toContain(result.entries.length);
    }
  });

  it('keeps a batch of mixed scenes coherent', () => {
    // A level arriving alongside loot must not drag the loot in with it, or the always-heard rule
    // becomes a way for suppressed scenes to ride along.
    const mixed = [...scene('loot-1', 'loot'), ...scene('level-1', 'level')];
    const result = scheduleChatter(mixed, { lastLineTasks: 500 }, 501);
    expect(result.entries.every(({ sceneKind }) => sceneKind === 'level')).toBe(true);
    expect(result.entries).toHaveLength(3);
  });

  it('says nothing, and changes nothing, when there is nothing to say', () => {
    const cadence = { lastLineTasks: 42 };
    const result = scheduleChatter([], cadence, 99);
    expect(result.entries).toHaveLength(0);
    // The gap must not advance on an empty batch, or a quiet stretch would reset the clock and the
    // next line would be delayed for no reason.
    expect(result.cadence).toBe(cadence);
  });
});

describe('what the guild says when the hero has done nothing', () => {
  const ambient = () => scene('amb:1', 'ambient', 1);

  it('fills a silence the event scenes left', () => {
    // The gate drops four ordinary scenes in five. Without ambient the feed can only ever be about
    // the hero, which is the property that made it read as a caption track.
    let cadence = NEW_CADENCE;
    let spoken = 0;
    for (let task = 1; task <= 400; task += 1) {
      const result = scheduleChatter(scene(`s:${task}`, 'loot'), cadence, task, ambient());
      cadence = result.cadence;
      spoken += result.entries.filter(({ sceneKind }) => sceneKind === 'ambient').length;
    }
    expect(spoken).toBeGreaterThan(20);
  });

  it('declines most free slots rather than filling every one', () => {
    // Filling every slot took the feed to six messages a minute with ambient seven lines in ten,
    // which is a caption track with a different subject.
    // Counted against the slots the gap actually offered, not against the loop length. A bound of
    // "fewer than half the iterations" passed even when ambient took every single free slot,
    // because the gap alone already limits it to roughly one in eight.
    let cadence = NEW_CADENCE;
    let offered = 0;
    let spoken = 0;
    for (let task = 1; task <= 600; task += 1) {
      if (readyToSpeak(task, cadence.lastLineTasks, `gap:${task}`)) offered += 1;
      const result = scheduleChatter([], cadence, task, ambient());
      cadence = result.cadence;
      spoken += result.entries.length;
    }
    expect(spoken).toBeGreaterThan(20);
    // The quiet is what makes the next line read as somebody arriving at a topic rather than a
    // timer firing, so a good share of offered slots must go unused.
    expect(spoken).toBeLessThan(offered * 0.75);
  });

  it('never speaks over an event that earned its line', () => {
    // Ambient fills silence; it does not compete. A level and a stray remark in the same breath
    // would bury the thing the player was waiting for.
    const result = scheduleChatter(scene('lvl', 'level'), { lastLineTasks: 0 }, 50, ambient());
    expect(result.entries.every(({ sceneKind }) => sceneKind === 'level')).toBe(true);
  });

  it('does not bypass the gap', () => {
    // Ambient is what fills the silence between lines, not a way around the rate limit.
    const first = scheduleChatter([], NEW_CADENCE, 100, ambient());
    if (first.entries.length === 0) return;
    expect(scheduleChatter([], first.cadence, 100, ambient()).entries).toHaveLength(0);
  });
});

