# Minimal deterministic legacy VM oracle

Research for [issue #39](https://github.com/williamzujkowski/progquest/issues/39), against the pinned legacy source at `pq-web-src` commit `3e9431b38cb54647530197501a29b8cce6c9f4f4`.

## Decision

The smallest faithful transition oracle should:

1. load only `pq-web-src/config.js` and `pq-web-src/main.js` into one fresh `node:vm` context;
2. provide the null-DOM and small jQuery compatibility surface already established by the legacy project's own console simulator;
3. inject a complete legacy sheet and four-number Alea state;
4. construct the real legacy `ProgressBar` and `ListBox` facades with their UI handles set to `null`;
5. force `TaskBar.position === TaskBar.max`, replace only the host-effect seams, and call the real `Timer1Timer()` exactly once; and
6. return a deliberately selected, plain-JSON transition record rather than the whole mutable legacy object.

This executes the authoritative task-completion order. `Timer1Timer()` records the completed task, advances XP, quest, and plot state, and only then calls `Dequeue()` to apply the completed task's reward and choose the next task ([`main.js:906-950`](../../pq-web-src/main.js#L906-L950)). Calling `Dequeue()` directly would omit those progression effects; emulating the formulas in the harness would merely create a second implementation.

The harness belongs under the fidelity-test layer, not `src/engine/`. It is an oracle for generating and checking legacy vectors, not production game code.

## Why these two scripts are sufficient

`config.js` owns the canonical tables, the Alea implementation, `Random()`, and the resumable `randseed()` state seam ([`config.js:43-145`](../../pq-web-src/config.js#L43-L145)). It also adds the integer `Number.prototype.div` behavior used throughout progression and defines `LevelUpTime()` ([`config.js:298-307`](../../pq-web-src/config.js#L298-L307)).

`main.js` owns task selection and reward processing ([`main.js:205-360`](../../pq-web-src/main.js#L205-L360)), list/bar data behavior ([`main.js:365-547`](../../pq-web-src/main.js#L365-L547)), quest rewards and selection ([`main.js:566-729`](../../pq-web-src/main.js#L566-L729)), acts, logs, stats, levels, and the tick transition ([`main.js:795-950`](../../pq-web-src/main.js#L795-L950)).

Do not execute `newguy.js` in the transition oracle. It is useful as the authoritative sheet-shape reference—its constructed character includes traits, RNG state, counters, equipment, ordered inventory and spells, act/quest/task state, five bars, and a task queue ([`newguy.js:112-159`](../../pq-web-src/newguy.js#L112-L159))—but executing it would add unrelated character-roll and form behavior. Do not execute `sim.js` either. Its own comments describe it as a console simulation, and it exposes `require`, reads and writes host files, installs synthetic timers, and evaluates scripts in the host context ([`sim.js:1-12`](../../pq-web-src/sim.js#L1-L12), [`sim.js:78-128`](../../pq-web-src/sim.js#L78-L128)).

## Required globals and stubs

Create a fresh context per vector. The context needs only the following pre-load globals:

| Global | Minimal behavior | Evidence |
| --- | --- | --- |
| `document` | `null` | The legacy console simulator uses a null document, and `main.js` skips ready-handler/UI wiring when it is false ([`sim.js:51-76`](../../pq-web-src/sim.js#L51-L76), [`main.js:562-563`](../../pq-web-src/main.js#L562-L563)). |
| `navigator` | `{ userAgent: "node-oracle" }` | `config.js` derives its iOS flags from `navigator.userAgent` ([`config.js:241-248`](../../pq-web-src/config.js#L241-L248)). |
| `window` | An object containing `location.href` and a no-op/in-memory `localStorage` shape | `config.js` selects its storage adapter at evaluation time from `window.localStorage`/`openDatabase` ([`config.js:160-176`](../../pq-web-src/config.js#L160-L176), [`config.js:246-248`](../../pq-web-src/config.js#L246-L248)). `main.js` assigns `window.onerror` during evaluation ([`main.js:1190-1198`](../../pq-web-src/main.js#L1190-L1198)). |
| `$` | A function returning `null`, plus `$.isFunction` and a jQuery-compatible `$.each` | The first-party simulator defines exactly this headless seam ([`sim.js:51-74`](../../pq-web-src/sim.js#L51-L74)). `$.each` must call the callback with both `(index, value)` and `this === value`, and stop on `false`, because progression uses all three semantics ([`main.js:626-643`](../../pq-web-src/main.js#L626-L643), [`main.js:886-888`](../../pq-web-src/main.js#L886-L888)). |
| `alert` | Throw an error | It turns an unexpected legacy failure path into a failed contract instead of silently continuing. The intended one-task path does not alert. |

Do **not** expose `process`, `require`, `module`, `Buffer`, filesystem functions, network APIs, `Worker`, `setTimeout`, `setInterval`, `setImmediate`, or `queueMicrotask`. Neither source script needs them for the synchronous transition when local storage is selected and the timer restart is replaced after loading.

After both scripts load, replace exactly two effect seams:

- `StartTimer = function () {}`. `Timer1Timer()` unconditionally calls it after the synchronous transition, while the real implementation creates and posts to a `Worker` ([`main.js:10-23`](../../pq-web-src/main.js#L10-L23), [`main.js:950`](../../pq-web-src/main.js#L950)). The no-op prevents a second transition; it does not alter the transition already performed.
- `storage.addToRoster = function (_sheet, callback) { if (callback) callback(); }`. Threshold vectors can reach `CompleteQuest()` or `LevelUp()`, whose save/brag path updates save metadata before handing the sheet to storage ([`main.js:666-729`](../../pq-web-src/main.js#L666-L729), [`main.js:875-884`](../../pq-web-src/main.js#L875-L884), [`main.js:1089-1096`](../../pq-web-src/main.js#L1089-L1096), [`main.js:1292-1295`](../../pq-web-src/main.js#L1292-L1295)). Replacing only the final persistence call preserves those synchronous legacy effects without writing storage.

Wrap, rather than replace, `Log`:

```js
var observedLog = [];
var legacyLog = Log;
Log = function (line) {
  observedLog.push(line);
  legacyLog(line);
};
```

The raw `game.log` object is keyed by `+new Date()` and can overwrite multiple messages emitted in the same millisecond ([`main.js:810-814`](../../pq-web-src/main.js#L810-L814)). Capturing arguments at the established logging seam preserves emission order and avoids making wall-clock timestamps part of a golden vector. The wrapper must be installed before the one transition and the timestamp-keyed `game.log`, `date`, and `stamp` fields must be excluded from normalized output.

## Context construction and limits

Use `vm.createContext()` and separate named `vm.Script` instances for bootstrap, `config.js`, `main.js`, fixture injection, the one transition, and normalization. Give source scripts their repository-relative filenames so failures identify the canonical line. Node documents that contextified scripts have a different global object, cannot access the caller's local scope, and reflect their global changes only through the supplied context ([Node `vm` API](https://nodejs.org/docs/latest-v24.x/api/vm.html#vm-executing-javascript), [`script.runInContext()`](https://nodejs.org/docs/latest-v24.x/api/vm.html#scriptrunincontextcontextifiedobject-options)).

Use these context options:

```js
{
  name: 'progquest-legacy-oracle',
  codeGeneration: { strings: false, wasm: false },
  microtaskMode: 'afterEvaluate'
}
```

Run every script with a small positive timeout (100–250 ms is ample for a single transition). Node specifies that `codeGeneration.strings: false` disables `eval`/function constructors, `wasm: false` disables WebAssembly compilation, and a run timeout terminates execution by throwing ([`vm.createContext()` options](https://nodejs.org/docs/latest-v24.x/api/vm.html#vmcreatecontextcontextobject-options), [`script.runInContext()` options](https://nodejs.org/docs/latest-v24.x/api/vm.html#scriptrunincontextcontextifiedobject-options)). `microtaskMode: "afterEvaluate"` includes context-created Promise work in the timeout, but host scheduling functions can still escape it; that is why none should be exposed ([Node timeout interactions](https://nodejs.org/docs/latest-v24.x/api/vm.html#timeout-interactions-with-asynchronous-tasks-and-promises)).

These are containment and determinism measures, **not** a sandbox for arbitrary code. Node explicitly states that `node:vm` is not a security mechanism and must not run untrusted code ([Node `vm` warning](https://nodejs.org/docs/latest-v24.x/api/vm.html#vm-executing-javascript)). The oracle is acceptable only for the repository-pinned legacy source. A downloaded save is data, must enter only as JSON, and must never be concatenated into executable source.

## Injecting a sheet and RNG state

Keep a fixture as host-owned JSON data with two members:

```text
{
  sheet: <complete legacy sheet>,
  rng: [s0, s1, s2, carry]
}
```

The sheet should retain legacy representation rather than modern representation:

- `Traits`, `Stats`, and `Equips` are keyed objects.
- `Inventory` is an ordered tuple array beginning with `['Gold', quantity]`.
- `Spells` is an ordered tuple array whose ranks are Roman numerals.
- `Quests` and `queue` are ordered arrays.
- `task` is the legacy machine tag, `kill` is the displayed caption, and each bar is `{ position, max }`.
- `tasks`, `elapsed`, `act`, `bestplot`, `bestquest`, `bestequip`, and `questmonster` fields are explicit.

Those representations come directly from the new-character sheet ([`newguy.js:112-159`](../../pq-web-src/newguy.js#L112-L159)) and the legacy list accessors ([`main.js:824-865`](../../pq-web-src/main.js#L824-L865)). Do not map it through the modern `CharacterSheet` first: the modern type separates numeric `Gold`, names `Equip` singular, uses object inventory/spell entries, and replaces the five bars with nested task/quest/plot fields ([`src/engine/types.ts:27-65`](../../src/engine/types.ts#L27-L65)). Mapping before observation would hide precisely the fidelity gaps that issue #39 must reveal.

Pass the fixture into the context as a JSON string and run `game = JSON.parse(fixtureJson)`. Do not interpolate values into source. Immediately call `randseed(game.seed)` or `randseed(fixtureRng)` before the transition. The legacy Alea state is exactly `[s0, s1, s2, c]`, and `randseed()` both restores and returns it ([`config.js:101-139`](../../pq-web-src/config.js#L101-L139)). The modern PRNG already exposes the same four-number get/set state seam ([`src/engine/prng.ts:24-29`](../../src/engine/prng.ts#L24-L29), [`src/engine/prng.ts:92-98`](../../src/engine/prng.ts#L92-L98)), so the post-transition tuple can later be compared without inventing a seed conversion.

The four values must come from `randseed()`/`Alea.state()`, not arbitrary decimals. Alea-emitted `s0`, `s1`, and `s2` values are 2^-32-aligned; otherwise legacy `seed.uint32() % n` can return a fractional result. The harness rejects states that Alea could not have serialized.

Construct the real data facades after assigning `game`:

- `ProgressBar` for `ExpBar`, `EncumBar`, `PlotBar`, `QuestBar`, and `TaskBar`;
- `ListBox` for `Traits`, `Stats`, `Spells`, `Equips`, `Inventory`, `Plots`, and `Quests`; and
- `AllLists` in the same order as `FormCreate()`.

`FormCreate()` is the authoritative wiring reference ([`main.js:953-976`](../../pq-web-src/main.js#L953-L976)), but calling it would immediately load storage and start browser lifecycle behavior ([`main.js:978-1013`](../../pq-web-src/main.js#L978-L1013)). Constructing the same facades directly avoids that effectful tail.

Because `$()` returns `null`, all facade UI methods naturally no-op while their game-data methods remain real ([`main.js:398-439`](../../pq-web-src/main.js#L398-L439), [`main.js:453-547`](../../pq-web-src/main.js#L453-L547)). Add one narrow headless correction:

```js
Inventory.rows = function () {
  return game.Inventory.map(function (row) {
    return { firstChild: { innerText: row[0] } };
  });
};
```

The rare `WinItem()` reuse branch selects an inventory DOM row and reads its first cell ([`main.js:658-663`](../../pq-web-src/main.js#L658-L663)). The correction supplies only that semantic label and permits vectors with more than 250 inventory rows; it must not reorder or filter entries.

## Advancing exactly one completed task

For every vector:

1. Record `beforeTasks = game.tasks` and the completed-task snapshot (`game.task`, `game.kill`, and `TaskBar.max`).
2. Set the fixture's `TaskBar.position` equal to `TaskBar.max`. Do not call the real-time branch, synthesize elapsed wall time, or repeatedly tick.
3. Install the effect seams and log wrapper described above.
4. Call `Timer1Timer()` once in a timeout-bounded VM script.
5. Assert `game.tasks === beforeTasks + 1` before normalizing.

The completion predicate is exactly `position >= max` ([`main.js:403-433`](../../pq-web-src/main.js#L403-L433)). In the completion branch the legacy engine adds `TaskBar.max / 1000` to XP, quest, plot, and total elapsed where applicable ([`main.js:906-940`](../../pq-web-src/main.js#L906-L940)). It then applies rewards and schedules one non-complete next task through `Dequeue()` ([`main.js:297-361`](../../pq-web-src/main.js#L297-L361)). A single call therefore represents one completed task even when plot cinematics append future queue entries.

Start with an ordinary offline kill vector whose XP, quest, plot, and encumbrance bars are not complete. Add independent boundary vectors by changing only fixture state:

1. XP exactly complete, to capture level/stat/spell effects.
2. Quest exactly complete with `act >= 1`, once for each of the four random quest rewards across fixed RNG states.
3. Plot exactly complete, at act 0 and at act greater than 1.
4. Encumbrance complete, to capture the market/sell loop.
5. Enough gold for buying, followed by equipment generation.
6. Kill-drop variants for a named item, `*`, and no drop.

Each vector still calls `Timer1Timer()` only once. This keeps failures local and avoids a long golden transcript becoming an opaque integration snapshot.

## Canonical normalized record

Normalize inside the context, verify every numeric progress field and RNG element with `Number.isFinite`, stringify the selected record there, and `JSON.parse` it in the host. Checking finiteness before serialization is important because JSON would otherwise turn `NaN` and infinities into `null`.

Use this stable shape:

```text
{
  completed: { tag, caption, durationMs },
  counters: { tasks, elapsedSeconds },
  character: {
    traits: { Name, Race, Class, Level },
    stats: [[K.Stats slot, numeric value], ...]
  },
  task: {
    tag: game.task,
    caption: game.kill,
    positionMs: TaskBar.position,
    maxMs: TaskBar.max,
    queue: [...game.queue]
  },
  xp: { positionSeconds: ExpBar.position, maxSeconds: ExpBar.max },
  encumbrance: { positionCubits: EncumBar.position, maxCubits: EncumBar.max },
  quest: {
    caption: game.bestquest,
    positionSeconds: QuestBar.position,
    maxSeconds: QuestBar.max,
    history: [...game.Quests],
    monster: game.questmonster || '',
    monsterIndex: game.questmonsterindex ?? null
  },
  plot: {
    act: game.act,
    caption: game.bestplot,
    positionSeconds: PlotBar.position,
    maxSeconds: PlotBar.max
  },
  inventory: game.Inventory.map(([name, qty]) => [name, Number(qty)]),
  equipment: K.Equips.map(slot => [slot, game.Equips[slot]]),
  spells: game.Spells.map(([name, roman]) => [name, roman, toArabic(roman)]),
  best: {
    stat: game.beststat,
    spell: game.bestspell,
    equipment: game.bestequip
  },
  log: [...observedLog],
  savedRng: game.seed,
  rng: randseed()
}
```

Preserve array order. Inventory index 0 is Gold and market logic sells index 1 ([`main.js:310-324`](../../pq-web-src/main.js#L310-L324)); quest history is appended and capped in order ([`main.js:719-723`](../../pq-web-src/main.js#L719-L723)); equipment slot order comes from `K.Equips` ([`config.js:325-335`](../../pq-web-src/config.js#L325-L335)); and spells are ordered list entries. Sorting any of them would discard observable behavior.

Keep raw units: task is milliseconds, XP/quest/plot/elapsed are seconds, and encumbrance is cubits. `savedRng` records the persisted `game.seed`: it remains the prior snapshot when no save occurs, or becomes the state captured by `SaveGame()` during a boundary transition. `rng` records the live state after `Dequeue()` finishes, so later random consumption remains observable. The `best` fields make persisted cache behavior observable: `SaveGame()` recalculates stat/spell metadata, while `WinEquip()` updates equipment metadata ([`main.js:618-620`](../../pq-web-src/main.js#L618-L620), [`main.js:1064-1095`](../../pq-web-src/main.js#L1064-L1095)).

Exclude derived `percent`, `remaining`, `time`, and `hint` fields; `ProgressBar.reposition()` recomputes them from position/max and presentation templates ([`main.js:406-425`](../../pq-web-src/main.js#L406-L425)). Also exclude save timestamps, online fields, and the timestamp-keyed `game.log`. They are wall-clock data or outside the one-task fidelity contract.

## Minimality and acceptance check

This design adds no runtime dependency, browser emulator, fake timer package, DOM implementation, or second rules engine. Node's standard library supplies isolation; the legacy code supplies transition behavior; the existing Vitest layer can compare the returned JSON record. The first golden-vector test should prove determinism by running the same fixture twice in fresh contexts and requiring byte-identical normalized records, then deliberately compare it to the current modern transition so the known simplified progression fails for behavioral—not harness—reasons.
