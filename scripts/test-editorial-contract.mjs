import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const MASTER_TAGLINE = 'Zero players. Zero developers. Progress continues regardless.';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('documents the four editorial registers and truth boundary', async () => {
  const contract = await read('docs/contracts/editorial-voice.md');

  for (const register of [
    'Literal mechanical record',
    'Pompous institutional interpretation',
    'Terse MMO/MUD world texture',
    'Rare cosmic escalation',
  ]) assert.match(contract, new RegExp(register, 'i'));

  for (const guardrail of [
    'named-creator style prompts',
    'protected characters, settings, or catchphrases',
    'unlicensed donor text, code, or assets',
    'false authorship or provenance claims',
  ]) assert.match(contract, new RegExp(guardrail, 'i'));

  assert.match(contract, /mechanical facts.*literal/i);
  assert.match(contract, /accessibility-critical text,[\s\S]*?stays literal/i);
  assert.match(contract, /human review; they are not\s+license clearance/i);
});

test('uses one numeral-independent master tagline and truthful credits', async () => {
  const [readme, navbar, notices] = await Promise.all([
    read('README.md'),
    read('src/components/Navbar.tsx'),
    read('public/THIRD_PARTY_NOTICES.txt'),
  ]);

  assert.match(readme, new RegExp(MASTER_TAGLINE.replaceAll('.', '\\.'), 'g'));
  assert.match(navbar, new RegExp(MASTER_TAGLINE.replaceAll('.', '\\.')));
  for (const surface of [readme, notices]) {
    assert.match(surface, /Eric Fredricksen/i);
    assert.match(surface, /original creator/i);
    assert.match(surface, /principal author/i);
    assert.match(surface, /contributors? and third-party/i);
    assert.match(surface, /directed and reviewed by William Zujkowski/i);
    assert.match(surface, /AI-assisted (research, implementation, and testing|implementation)/i);
  }
  assert.match(await read('docs/contracts/editorial-voice.md'), /principal author[\s\S]*contributors? and third-party attribution/i);
  assert.match(notices, /^PROJECT CREDIT$/m);
});

test('applies the voice without obscuring PWA or empty-state facts', async () => {
  const [pwa, inventory, characterSheet] = await Promise.all([
    read('src/pwa.ts'),
    read('src/components/InventoryView.tsx'),
    read('src/components/CharacterSheet.tsx'),
  ]);

  assert.match(pwa, /new edition is ready/i);
  assert.match(pwa, /applying the new edition/i);
  assert.match(pwa, /offline mode is unavailable/i);
  assert.match(inventory, /No loot has been retained[\s\S]*Combat supplies it automatically/i);
  assert.match(characterSheet, /No spells have been learned[\s\S]*level-up[\s\S]*completed quests/i);
});

test('provides a factual release-note template with optional institutional commentary', async () => {
  const template = await read('.github/release-note-template.md');

  for (const field of ['Release', 'Deployed commit', 'User-visible changes', 'Verification', 'Known limitations']) {
    assert.match(template, new RegExp(`^## ${field}`, 'm'));
  }
  assert.match(template, /^## Institutional interpretation$/m);
  assert.match(template, /optional/i);
  assert.match(template, /Never replace.*facts/i);
});
