import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const configSource = readFileSync(new URL('../pq-web-src/config.js', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../pq-web-src/main.js', import.meta.url), 'utf8');
const executionOptions = { timeout: 250 };
const aleaScale = 0x100000000;

function isSerializedAleaState(state) {
  return Array.isArray(state)
    && state.length === 4
    && state.slice(0, 3).every((value) => Number.isFinite(value)
      && value >= 0
      && value < 1
      && Number.isInteger(value * aleaScale))
    && Number.isInteger(state[3])
    && state[3] >= 0
    && state[3] <= 2091639;
}

function createContext() {
  const dollar = () => null;
  dollar.each = (object, callback) => {
    const keys = Array.isArray(object) || typeof object.length === 'number'
      ? Array.from({ length: object.length }, (_, index) => index)
      : Object.keys(object);
    for (const key of keys) {
      if (callback.call(object[key], key, object[key]) === false) break;
    }
    return object;
  };
  dollar.isFunction = (value) => typeof value === 'function';
  dollar.isArray = Array.isArray;

  const localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  return vm.createContext(
    {
      $: dollar,
      alert(message) { throw new Error(`Unexpected legacy alert: ${message}`); },
      document: null,
      navigator: { userAgent: 'legacy-oracle' },
      window: { localStorage, location: { href: '#' } },
    },
    {
      name: 'progquest-legacy-oracle',
      codeGeneration: { strings: false, wasm: false },
      microtaskMode: 'afterEvaluate',
    },
  );
}

export function runLegacyTransition({ sheet }) {
  if (!isSerializedAleaState(sheet.seed)) {
    throw new TypeError('Legacy fixture seed must be a serialized Alea state');
  }
  const context = createContext();
  vm.runInContext(configSource, context, { ...executionOptions, filename: 'pq-web-src/config.js' });
  vm.runInContext(mainSource, context, { ...executionOptions, filename: 'pq-web-src/main.js' });
  context.__sheetJson = JSON.stringify(sheet);

  const output = vm.runInContext(
    `
      game = JSON.parse(__sheetJson);
      randseed(game.seed);
      StartTimer = function () {};
      storage.addToRoster = function (sheet, callback) { if (callback) callback(); };
      var observedLog = [];
      var legacyLog = Log;
      Log = function (line) { observedLog.push(line); legacyLog(line); };
      ExpBar = new ProgressBar('ExpBar', '$remaining XP needed for next level');
      EncumBar = new ProgressBar('EncumBar', '$position/$max cubits');
      PlotBar = new ProgressBar('PlotBar', '$time remaining');
      QuestBar = new ProgressBar('QuestBar', '$percent% complete');
      TaskBar = new ProgressBar('TaskBar', '$percent%');
      Traits = new ListBox('Traits', 2, K.Traits);
      Stats = new ListBox('Stats', 2, K.Stats);
      Spells = new ListBox('Spells', 2);
      Equips = new ListBox('Equips', 2, K.Equips);
      Inventory = new ListBox('Inventory', 2);
      Plots = new ListBox('Plots', 1);
      Quests = new ListBox('Quests', 1);
      Inventory.rows = function () {
        return game.Inventory.map(function (row) { return { firstChild: { innerText: row[0] } }; });
      };
      AllBars = [ExpBar, PlotBar, TaskBar, QuestBar, EncumBar];
      AllLists = [Traits, Stats, Spells, Equips, Inventory, Plots, Quests];
      $.each(AllBars.concat(AllLists), function (index, item) { item.load(game); });
      if (TaskBar.Position() !== TaskBar.Max()) throw new Error('Legacy fixture must start at task completion');
      var completed = {
        tag: game.task,
        caption: game.kill,
        durationMs: game.TaskBar.max
      };
      var beforeTasks = game.tasks;
      Timer1Timer();
      if (game.tasks !== beforeTasks + 1) throw new Error('Legacy transition did not complete exactly one task');
      var record = {
        completed: completed,
        counters: { tasks: game.tasks, elapsedSeconds: game.elapsed },
        character: {
          traits: {
            Name: game.Traits.Name,
            Race: game.Traits.Race,
            Class: game.Traits.Class,
            Level: game.Traits.Level
          },
          stats: K.Stats.map(function (name) { return [name, Number(game.Stats[name])]; })
        },
        task: {
          tag: game.task,
          caption: game.kill,
          positionMs: game.TaskBar.position,
          maxMs: game.TaskBar.max,
          queue: game.queue
        },
        xp: {
          positionSeconds: game.ExpBar.position,
          maxSeconds: game.ExpBar.max
        },
        quest: {
          caption: game.bestquest,
          positionSeconds: game.QuestBar.position,
          maxSeconds: game.QuestBar.max,
          history: game.Quests,
          monster: game.questmonster || '',
          monsterIndex: game.questmonsterindex === undefined || game.questmonsterindex === null
            ? null
            : game.questmonsterindex
        },
        plot: {
          act: game.act,
          caption: game.bestplot,
          positionSeconds: game.PlotBar.position,
          maxSeconds: game.PlotBar.max
        },
        inventory: game.Inventory.map(function (row) { return [row[0], Number(row[1])]; }),
        equipment: K.Equips.map(function (slot) { return [slot, game.Equips[slot]]; }),
        spells: game.Spells.map(function (row) { return [row[0], row[1], toArabic(row[1])]; }),
        log: observedLog,
        rng: randseed()
      };
      function assertFiniteNumbers(value, path) {
        if (typeof value === 'number' && !Number.isFinite(value)) {
          throw new Error('Non-finite legacy oracle value at ' + path);
        }
        if (Array.isArray(value)) {
          value.forEach(function (item, index) { assertFiniteNumbers(item, path + '[' + index + ']'); });
        } else if (value && typeof value === 'object') {
          Object.keys(value).forEach(function (key) { assertFiniteNumbers(value[key], path + '.' + key); });
        }
      }
      assertFiniteNumbers(record, 'record');
      JSON.stringify(record);
    `,
    context,
    { ...executionOptions, filename: 'scripts/legacy-oracle-transition.js' },
  );

  return JSON.parse(output);
}
