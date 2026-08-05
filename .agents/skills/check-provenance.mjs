#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Compares each imported skill against the upstream revision PROVENANCE.md records.
 *
 * Deliberately not part of `npm test`. It reaches the network, and a suite that fails when GitHub
 * is unreachable is testing connectivity rather than the repository. Run it when refreshing an
 * import, so what PROVENANCE.md records is a measurement rather than an intention.
 *
 * Reads the revisions from PROVENANCE.md rather than repeating them, so the document stays the
 * single place they are stated.
 */

const here = dirname(fileURLToPath(import.meta.url));
const provenance = await readFile(join(here, 'PROVENANCE.md'), 'utf8');

const revisionOf = (repository) => {
  const row = new RegExp(`\\[${repository.replace('/', '\\/')}\\][^|]*\\|\\s*\`([0-9a-f]{40})\``);
  const match = provenance.match(row);
  if (!match) throw new Error(`PROVENANCE.md records no revision for ${repository}.`);
  return match[1];
};

const IMPORTS = [
  ...[
    ['code-review', 'engineering'], ['to-spec', 'engineering'], ['to-tickets', 'engineering'],
    ['triage', 'engineering'], ['wayfinder', 'engineering'], ['tdd', 'engineering'],
    ['prototype', 'engineering'], ['implement', 'engineering'], ['research', 'engineering'],
    ['diagnosing-bugs', 'engineering'], ['domain-modeling', 'engineering'],
    ['codebase-design', 'engineering'], ['improve-codebase-architecture', 'engineering'],
    ['resolving-merge-conflicts', 'engineering'], ['grill-with-docs', 'engineering'],
    ['grilling', 'productivity'], ['grill-me', 'productivity'], ['teach', 'productivity'],
    ['handoff', 'productivity'],
  ].map(([skill, area]) => ({
    skill,
    repository: 'mattpocock/skills',
    path: `skills/${area}/${skill}/SKILL.md`,
  })),
  { skill: 'ponytail', repository: 'DietrichGebert/ponytail', path: 'skills/ponytail/SKILL.md' },
];

const fetchUpstream = async (repository, path, revision) => {
  const url = `https://raw.githubusercontent.com/${repository}/${revision}/${path}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.text();
};

let identical = 0;
let modified = 0;
let missing = 0;

for (const { skill, repository, path } of IMPORTS) {
  const revision = revisionOf(repository);
  const [upstream, local] = await Promise.all([
    fetchUpstream(repository, path, revision),
    readFile(join(here, skill, 'SKILL.md'), 'utf8').catch(() => null),
  ]);

  if (upstream === null) { console.log(`${skill}: not present upstream at the audited revision`); missing += 1; continue; }
  if (local === null) { console.log(`${skill}: not present locally`); missing += 1; continue; }

  if (upstream === local) { identical += 1; continue; }

  // Line counts rather than a diff: the point is whether PROVENANCE.md's claim still holds, and a
  // full diff belongs in whatever review is refreshing the import.
  const upstreamLines = upstream.split('\n');
  const localLines = local.split('\n');
  const changed = upstreamLines.filter((line) => !localLines.includes(line)).length
    + localLines.filter((line) => !upstreamLines.includes(line)).length;
  console.log(`${skill}: differs from the audited revision (${changed} lines)`);
  modified += 1;
}

console.log(`\n${identical} identical, ${modified} modified, ${missing} unresolved.`);
if (missing > 0) process.exitCode = 1;
