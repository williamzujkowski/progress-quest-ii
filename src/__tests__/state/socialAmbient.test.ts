import { describe, expect, it, vi } from 'vitest';
import { AMBIENT_LINES, FEUD_BEATS, QUESTION_BEATS, REACTION_LINES, TRADE_LINES } from '../../data/socialAmbient';
import { projectAmbient } from '../../state/socialProjection';
import { SOCIAL_PERSONAS } from '../../data/socialCatalog';

const HERO = { name: 'Krg', race: 'Sub-Subprocessor', className: 'Robot Monk' } as const;
const ALL = [...AMBIENT_LINES, ...TRADE_LINES, ...REACTION_LINES, ...FEUD_BEATS, ...QUESTION_BEATS];

describe('the guild talks about itself', () => {
  it('is deterministic and touches no clock or random source', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('random forbidden'); });
    const now = vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('clock forbidden'); });

    const once = Array.from({ length: 300 }, (_, task) => JSON.stringify(projectAmbient(HERO, task)));
    const twice = Array.from({ length: 300 }, (_, task) => JSON.stringify(projectAmbient(HERO, task)));

    expect(twice).toEqual(once);
    expect(random).not.toHaveBeenCalled();
    expect(now).not.toHaveBeenCalled();
    random.mockRestore();
    now.mockRestore();
  });

  it('says one thing at a time', () => {
    // Somebody says a thing and the channel moves on. A burst of ambient would be a caption track
    // with a different subject.
    for (let task = 0; task < 200; task += 1) expect(projectAmbient(HERO, task)).toHaveLength(1);
  });

  it('reaches every lane, including the two slow ones', () => {
    const lanes = new Set(Array.from({ length: 2000 }, (_, task) => projectAmbient(HERO, task)[0]?.sceneId.split(':')[2]));
    expect(lanes).toEqual(new Set(['ambient', 'reaction', 'trade', 'feud', 'question']));
  });

  it('draws all four seats, which the event scenes never managed', () => {
    // Two of four seats spoke 95% of cast lines in the measured baseline, because loot and market
    // are 90% of events and they always open with the same seat.
    const speakers = new Set(Array.from({ length: 600 }, (_, task) => projectAmbient(HERO, task)[0]?.speaker.displayName));
    expect(speakers.size).toBeGreaterThanOrEqual(4);
  });

  it('speaks as somebody from this hero’s own troupe', () => {
    // Identity is asserted as a whole rather than by name. Checking the display name alone let a
    // mutation that pinned every line to one persona's id sail through, because the name still
    // varied and the two disagreed.
    const byId = new Map(SOCIAL_PERSONAS.map((persona) => [persona.id, persona]));
    for (let task = 0; task < 200; task += 1) {
      const entry = projectAmbient(HERO, task)[0];
      const persona = byId.get(entry?.speaker.id ?? '');
      expect(persona).toBeDefined();
      expect(entry?.speaker.displayName).toBe(persona?.displayName);
      expect(entry?.speaker.role).toBe(persona?.role);
      expect(entry?.speaker.fictional).toBe(true);
      expect(entry?.speaker.automaticHero).toBe(false);
    }
  });

  it('repeats its advertisement verbatim, which is the one place repetition is the joke', () => {
    const ads = new Set(
      Array.from({ length: 4000 }, (_, task) => projectAmbient(HERO, task)[0])
        .filter((entry) => entry?.sceneId.endsWith(':trade'))
        .map((entry) => entry?.text),
    );
    // A trade channel that varied its spam would be less true, not more.
    expect(ads.size).toBe(1);
  });

  it('walks its running bits in order and starts them again', () => {
    const beats = Array.from({ length: 4000 }, (_, task) => projectAmbient(HERO, task)[0])
      .filter((entry) => entry?.sceneId.endsWith(':feud'))
      .map((entry) => entry?.text);
    const seen = [...new Set(beats)];
    // Every beat is reached, and the first one comes back — a feud that restarts is truer than one
    // that concludes.
    expect(seen.length).toBe(FEUD_BEATS.length);
    expect(beats.filter((text) => text === FEUD_BEATS[0]?.text).length).toBeGreaterThan(1);
  });

  it('refuses a task count it cannot use', () => {
    expect(projectAmbient(HERO, Number.NaN)).toEqual([]);
    expect(projectAmbient(HERO, -1)).toEqual([]);
  });
});

describe('the written bank', () => {
  it('has a short tail, which the event corpus entirely lacked', () => {
    // Measured at 9.7 words mean with no lines under five. The one-to-three word utterance is the
    // most common in a real channel and was zero per cent of this one.
    const short = ALL.filter(({ text }) => text.split(/\s+/).length <= 3);
    expect(short.length).toBeGreaterThanOrEqual(8);
  });

  it('carries lines that are not jokes', () => {
    // A channel where every utterance is a polished aphorism reads as generated however good each
    // aphorism is. These are what make the others detectable as jokes.
    const plain = ['back', 'afk, kettle', 'Kettle.', 'Received.', 'Noted.', 'Logged.'];
    for (const text of plain) expect(ALL.some((line) => line.text === text)).toBe(true);
  });

  it('does not lean on the construction that is already a fingerprint', () => {
    // "emotionally complete and legally decorative" is the best move in this project's kit and is
    // spent often enough in the event corpus to be recognisable. None here.
    const paired = ALL.filter(({ text }) => /\b\w+ly \w+ and \w+ly \w+/.test(text));
    expect(paired).toEqual([]);
  });

  it('names no real vendor, product, lab, or person', () => {
    const serialized = JSON.stringify(ALL).toLowerCase();
    for (const forbidden of [
      'aws', 'amazon', 'azure', 'google', 'microsoft', 'oracle', 'nvidia', 'intel', 'apple',
      'kubernetes', 'docker', 'jira', 'slack', 'github', 'postgres', 'redis', 'nginx',
      'openai', 'anthropic', 'deepmind', 'chatgpt', 'claude', 'gemini', 'copilot', 'llama',
      'turing', 'lovelace', 'mccarthy', 'minsky', 'hopper', 'torvalds', 'stallman',
      'everquest', 'world of warcraft', 'http://', 'https://',
    ]) expect(serialized, `ambient bank must not name ${forbidden}`).not.toContain(forbidden);
  });

  it('carries no markup, control characters, or bidirectional overrides', () => {
    const serialized = JSON.stringify(ALL);
    expect(serialized).not.toMatch(/[<>‪-‮⁦-⁩]/u);
    expect(Array.from(serialized).some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f);
    })).toBe(false);
  });

  it('states no figure, because an ambient line citing one would be asserting state', () => {
    for (const { text } of ALL) expect(text).not.toMatch(/\d/);
  });

  it('fits the persona word caps', () => {
    const cap = Math.min(...SOCIAL_PERSONAS.map(({ voice }) => voice.maxWords));
    for (const { text } of ALL) expect(text.split(/\s+/).length).toBeLessThanOrEqual(cap);
  });
});
