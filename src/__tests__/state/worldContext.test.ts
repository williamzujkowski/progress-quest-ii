import { describe, expect, it } from 'vitest';
import { createNewCharacter, generateEquipUpgrade } from '../../engine/sim';
import { RandomGenerator } from '../../engine/prng';
import { advanceGame, type GamePresentationSnapshot, type GameTransitionEvent } from '../../engine/transition';
import { activeCheckpointV1Schema } from '../../state/schemas';
import { encodePQWSave } from '../../state/saveManager';
import { projectWorld, type IdentifiedGameTransitionRecord } from '../../state/worldContext';

const snapshot = (overrides: Partial<GamePresentationSnapshot> = {}): GamePresentationSnapshot => ({
  hero: { name: 'Krg', race: 'Hob-Hobbit', className: 'Robot Monk', level: 7 },
  act: 2,
  completedTask: 'kill',
  nextTask: 'kill',
  completedTasks: 42,
  elapsedSeconds: 3671,
  activeQuest: { kind: 'exterminate', target: 'Rat|1|tail', targetIndex: 0 },
  ...overrides,
});

const source = (
  activityId: number,
  event: GameTransitionEvent,
  post = snapshot(),
): IdentifiedGameTransitionRecord => ({ activityId, record: { event, post } });

describe('world context projection', () => {
  it('projects a deterministic departure and arrival when the hero gains a level', () => {
    const input = { kind: 'transition', source: source(40, { type: 'level_gained', level: 7 }) } as const;

    const first = projectWorld(input);
    const replay = projectWorld(input);

    expect(replay).toEqual(first);
    expect(first.context).toMatchObject({ venue: 'field', activity: 'advancement', level: 7, act: 2 });
    expect(first.notices.map(({ kind }) => kind)).toEqual(['departure', 'arrival']);
    expect(first.notices.every(({ sourceActivityId }) => sourceActivityId === 40)).toBe(true);
    expect(first.notices[0]?.text).not.toContain(first.context.location);
    expect(first.notices[1]?.text).toContain(first.context.location);
  });

  it('files the next hunting ground independently of an intervening boss cinematic', () => {
    const projection = projectWorld({
      kind: 'transition',
      source: source(47, { type: 'level_gained', level: 7 }, snapshot({ nextTask: 'cinematic', interplotRole: 'nemesis' })),
    });

    expect(projection.context.venue).toBe('dungeon');
    expect(projection.notices.find(({ kind }) => kind === 'arrival')?.text).toContain('// L7');
    expect(projection.notices.find(({ kind }) => kind === 'arrival')?.text).not.toContain(projection.context.location);
  });

  it('classifies market work from typed task facts instead of rendered descriptions', () => {
    const description = 'This wording is deliberately useless.';
    const road = projectWorld({
      kind: 'transition',
      source: source(41, { type: 'task_started', task: { description, durationMs: 1, elapsedMs: 0, type: 'heading_to_market' } }, snapshot({ nextTask: 'heading_to_market' })),
    });
    const sale = projectWorld({
      kind: 'transition',
      source: source(42, { type: 'task_started', task: { description, durationMs: 1, elapsedMs: 0, type: 'selling' } }, snapshot({ nextTask: 'selling' })),
    });

    expect(road.context).toMatchObject({ venue: 'road', activity: 'travel' });
    expect(sale.context).toMatchObject({ venue: 'town', activity: 'sell' });
    expect(road.context.location).not.toBe(sale.context.location);
  });

  it('announces market arrival and departure only at typed market boundaries', () => {
    const started = (activityId: number, completedTask: GamePresentationSnapshot['completedTask'], nextTask: 'selling' | 'heading') => projectWorld({
      kind: 'transition',
      source: source(activityId, {
        type: 'task_started',
        task: { description: 'Opaque transition', durationMs: 1, elapsedMs: 0, type: nextTask },
      }, snapshot({ completedTask, nextTask })),
    });

    expect(started(100, 'heading_to_market', 'selling').notices.map(({ kind }) => kind)).toEqual(['arrival']);
    expect(started(101, 'selling', 'selling').notices).toEqual([]);
    expect(started(102, 'selling', 'heading').notices.map(({ kind }) => kind)).toEqual(['departure']);
    expect(started(103, 'act_marker', 'heading').notices).toEqual([]);
    expect(started(104, 'heading', 'selling').notices).toEqual([]);
  });

  it('classifies typed quest scope without parsing the quest description', () => {
    const projection = projectWorld({
      kind: 'transition',
      source: source(
        43,
        { type: 'quest_started', description: 'Opaque assignment prose' },
        snapshot({ activeQuest: { kind: 'deliver' } }),
      ),
    });

    expect(projection.context.assignmentScope).toBe('travel');
    expect(projection.notices).toEqual([
      expect.objectContaining({ kind: 'assignment', sourceActivityId: 43 }),
    ]);
  });

  it('uses the completed quest identity instead of the replacement quest identity', () => {
    const projection = projectWorld({
      kind: 'transition',
      source: source(143, { type: 'quest_completed', description: 'Opaque completed quest' }, snapshot({
        completedQuest: { kind: 'deliver' },
        activeQuest: { kind: 'seek' },
      })),
    });

    expect(projection.context.assignmentScope).toBe('travel');
  });

  it('derives reachable filing rarity from generated quality composition while denying combat effects', () => {
    const labels = new Set<string>();
    for (let level = 1; level <= 60; level += 1) {
      for (let sample = 0; sample < 80; sample += 1) {
        const upgrade = generateEquipUpgrade(new RandomGenerator(`rarity:${level}:${sample}`), level);
        const projection = projectWorld({
          kind: 'transition',
          source: source(44, { type: 'equipment_gained', ...upgrade }, snapshot({ hero: { ...snapshot().hero, level } })),
        });
        if (projection.equipment) labels.add(projection.equipment.label);
        expect(projection.equipment?.quality).toBe(level);
        expect(projection.equipment?.combatContribution).toBe('none');
      }
    }

    expect(labels).toEqual(new Set(['questionable', 'serviceable', 'notable', 'legendary']));
  });

  it('frames only typed nemesis openings and escalates them to raids at Act 10', () => {
    const opening = (act: number, interplotRole?: 'nemesis') => projectWorld({
      kind: 'transition',
      source: source(48 + act, {
        type: 'task_started',
        task: { description: 'Opaque cinematic', durationMs: 1, elapsedMs: 0, type: 'cinematic' },
      }, snapshot({ act, nextTask: 'cinematic', ...(interplotRole ? { interplotRole } : {}) })),
    });

    expect(opening(9, 'nemesis').context.venue).toBe('dungeon');
    expect(opening(10, 'nemesis').context.venue).toBe('raid');
    expect(opening(10, 'nemesis').notices[0]?.text).toContain('Raid-class');
    expect(opening(10).context.venue).toBe('cinematic');
    expect(opening(10).notices).toEqual([]);
  });

  it('reports each typed market sale and the field return in sequence', () => {
    const transitions = [
      source(200, { type: 'task_started', task: { description: 'x', durationMs: 1, elapsedMs: 0, type: 'heading_to_market' } }, snapshot({ completedTask: 'act_marker', nextTask: 'heading_to_market' })),
      source(201, { type: 'task_started', task: { description: 'x', durationMs: 1, elapsedMs: 0, type: 'selling' } }, snapshot({ completedTask: 'heading_to_market', nextTask: 'selling' })),
      source(202, { type: 'inventory_sold', gold: 15 }, snapshot({ completedTask: 'selling', nextTask: 'selling', marketSale: { name: 'rat tail', quantity: 3, gold: 15 } })),
      source(203, { type: 'inventory_sold', gold: 10 }, snapshot({ completedTask: 'selling', nextTask: 'buying', marketSale: { name: 'old boot', quantity: 2, gold: 10 } })),
      source(204, { type: 'task_started', task: { description: 'x', durationMs: 1, elapsedMs: 0, type: 'buying' } }, snapshot({ completedTask: 'selling', nextTask: 'buying' })),
      source(205, { type: 'task_started', task: { description: 'x', durationMs: 1, elapsedMs: 0, type: 'heading' } }, snapshot({ completedTask: 'buying', nextTask: 'heading' })),
      source(206, { type: 'task_started', task: { description: 'x', durationMs: 1, elapsedMs: 0, type: 'kill' } }, snapshot({ completedTask: 'heading', nextTask: 'kill' })),
    ];
    const filings = transitions.flatMap((record) => projectWorld({ kind: 'transition', source: record }).notices);

    expect(filings.map(({ kind }) => kind)).toEqual(['departure', 'arrival', 'commerce', 'commerce', 'commerce', 'departure', 'arrival']);
    expect(filings[2]?.text).toContain('3× rat tail');
    expect(filings[3]?.text).toContain('2× old boot');
  });

  it('announces the canonical kill-to-market encumbrance boundary', () => {
    const character = createNewCharacter('Burdened Oracle', 'Half Orc', 'Robot Monk', 'world-market-boundary');
    character.Plot = { act: 1, currentProgress: 0, maxProgress: 100 };
    character.PendingTasks = undefined;
    character.Inventory = [{ name: 'rat tail', qty: 100 }];
    character.Task = { description: 'Executing fixed paperwork...', durationMs: 1, elapsedMs: 0, type: 'kill', loot: { type: 'fixed', item: 'rat tail' } };
    const result = advanceGame({ character, progression: { experience: { currentSeconds: 0, maxSeconds: 10 }, completedTasks: 0, elapsedSeconds: 0 } }, 1, new RandomGenerator('world-market-transition'));
    const record = result.records.find(({ event }) => event.type === 'task_started' && event.task.type === 'heading_to_market');
    expect(record).toBeDefined();
    if (!record) throw new Error('Expected canonical market departure');

    expect(projectWorld({ kind: 'transition', source: { activityId: 300, record } }).notices.map(({ kind }) => kind)).toEqual(['departure']);
  });

  it('keeps hostile sale names bounded and preserves exact quantity and gold metadata', () => {
    const hostileName = `${'x'.repeat(160)}\u202egold 999\u2066`;
    const projection = projectWorld({
      kind: 'transition',
      source: source(301, { type: 'inventory_sold', gold: 17 }, snapshot({
        marketSale: { name: hostileName, quantity: 3, gold: 17 },
      })),
    });
    const text = projection.notices[0]?.text ?? '';

    expect(text).toMatch(/^Sold 3× /);
    expect(text).toMatch(/ for 17 gold\.$/);
    expect(text).not.toMatch(/[\u202a-\u202e\u2066-\u2069]/u);
    expect(Array.from(text).length).toBeLessThanOrEqual(180);
  });

  it('certifies only an explicit typed spell reward', () => {
    const projection = projectWorld({
      kind: 'transition',
      source: source(
        45,
        { type: 'quest_completed', description: 'Opaque completed quest' },
        snapshot({ spellRewards: [{ name: 'Rabbit Punch', level: 2, source: 'quest' }] }),
      ),
    });

    expect(projection.context.activity).toBe('quest');
    expect(projection.notices).toEqual([
      expect.objectContaining({ kind: 'training', sourceActivityId: 45 }),
    ]);
    expect(projection.notices[0]?.text).toContain('quest reward');
    expect(projection.notices[0]?.text).toContain('no combat effect');
  });

  it('keeps finite names legible at absurd progression values', () => {
    const projection = projectWorld({
      kind: 'transition',
      source: source(
        46,
        { type: 'level_gained', level: 1_000_000_000 },
        snapshot({ hero: { name: 'Krg', race: 'Hob-Hobbit', className: 'Robot Monk', level: 1_000_000_000 }, act: 1_000_000_000 }),
      ),
    });

    expect(projection.context.location).toMatch(/1\.00e9/);
    expect(projection.context.spokenLocation).toContain('1 billion');
    expect(projection.context.location.length).toBeLessThanOrEqual(80);
    expect(projection.notices.every(({ text }) => text.length <= 180)).toBe(true);
  });

  it('leaves canonical state, event order, save bytes, and gameplay RNG identical when enabled', () => {
    const run = (enabled: boolean) => {
      const character = createNewCharacter('Parity Oracle', 'Half Orc', 'Robot Monk', 'world-parity-character');
      character.Plot = { act: 1, currentProgress: 1, maxProgress: 1 };
      character.Quest = { description: 'Typed assignment', currentProgress: 1, maxProgress: 1, history: ['Typed assignment'], kind: 'deliver' };
      character.Task = { description: 'Executing fixed paperwork...', durationMs: 1, elapsedMs: 0, type: 'kill', loot: { type: 'fixed', item: 'rat tail' } };
      character.PendingTasks = undefined;
      character.Inventory = [{ name: 'rat tail', qty: 50 }, { name: 'old boot', qty: 50 }];
      character.Gold = 1_000_000;
      const rng = new RandomGenerator('world-parity-transition');
      const result = advanceGame({
        character,
        progression: { experience: { currentSeconds: 1, maxSeconds: 1 }, completedTasks: 0, elapsedSeconds: 0 },
      }, 120_000, rng);
      const recordsBefore = JSON.stringify(result.records);
      if (enabled) result.records.forEach((record, activityId) => projectWorld({ kind: 'transition', source: { activityId, record } }));
      const checkpoint = activeCheckpointV1Schema.parse({
        schemaVersion: 1,
        session: {
          ...result.state,
          rngState: rng.getState(),
          pendingElapsedMs: result.remainingElapsedMs,
          isPaused: false,
          log: result.records.slice(-50).map(({ event }) => event.type),
        },
      });
      const checkpointBytes = JSON.stringify(checkpoint);
      const pqwBytes = encodePQWSave(result.state.character);
      return {
        state: result.state,
        records: result.records,
        recordsUnmutated: JSON.stringify(result.records) === recordsBefore,
        remainingElapsedMs: result.remainingElapsedMs,
        rng: rng.getState(),
        checkpointBytes,
        pqwBytes,
      };
    };

    const enabled = run(true);
    expect(enabled.recordsUnmutated).toBe(true);
    const eventTypes = new Set(enabled.records.map(({ event }) => event.type));
    for (const type of ['level_gained', 'quest_completed', 'act_completed', 'inventory_sold', 'equipment_purchased'] as const) {
      expect(eventTypes.has(type)).toBe(true);
    }
    expect(enabled).toEqual(run(false));
  });
});
