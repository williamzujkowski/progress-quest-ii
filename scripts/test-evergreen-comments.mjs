import assert from 'node:assert/strict';
import test from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

/**
 * Comments may not cite an issue or pull request number.
 *
 * AGENTS.md has asked for evergreen comments for a long time, and twenty-five accumulated anyway,
 * because nothing read the rule. That is the same shape as the markdown links that rotted: a
 * standard nobody disagreed with and nobody checked.
 *
 * The rule is not fussiness about style. A number is a pointer into a system the reader of the code
 * may not have open, and it tends to stand in for the fact it should be stating. A comment reading
 * `<number>: deleting a character is the only action here that destroys player data` is strictly
 * better with the number gone — the sentence after it is the durable fact, and provenance is what `git blame` is for, with
 * a date attached and no chance of drifting.
 *
 * Scope is deliberately narrow. Only issue and PR numbers are checked, because they are decidable:
 * a comment either cites one or it does not. Temporal words are not checked, because most uses of
 * them are correct — "closes whichever tooltip is currently open" describes runtime state and reads
 * correctly forever. A gate that cannot tell those apart would train people to reword good English
 * to satisfy it, which is worse than the problem.
 */

const REPO_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

const SKIPPED_DIRECTORIES = new Set([
  'node_modules', '.git', 'dist', 'coverage', 'test-results', 'playwright-report', '.nexus-agents',
  // Vendored upstream text. AGENTS.md requires imports to be refreshed through their own workflow
  // rather than edited here, so this gate must not demand changes inside them.
  '.agents',
]);

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mjs'];

// `.css` is excluded by the extension list rather than by a rule here: a three or six digit hex
// colour is indistinguishable from an issue reference to this pattern, and colours are the far more
// common thing to write after a `#` in a stylesheet.
const ISSUE_REFERENCE = /(?<![0-9a-fA-F])#\d{2,4}\b/;

const COMMENT_LINE = /^\s*(?:\/\/|\*|\/\*)/;

async function sourceFiles(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await sourceFiles(path));
    else if (SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) found.push(path);
  }
  return found;
}

export async function findIssueReferencesInComments(root) {
  const found = [];
  for (const file of await sourceFiles(root)) {
    const text = await readFile(file, 'utf8');
    text.split('\n').forEach((line, index) => {
      if (!COMMENT_LINE.test(line)) return;
      if (ISSUE_REFERENCE.test(line)) found.push({ file: relative(root, file), line: index + 1, text: line.trim() });
    });
  }
  return found;
}

test('no comment cites an issue or pull request number', async () => {
  const found = await findIssueReferencesInComments(REPO_ROOT);
  const report = found.map(({ file, line, text }) => `  ${file}:${line}  ${text.slice(0, 100)}`).join('\n');
  assert.deepEqual(
    found,
    [],
    `Comments citing issue or PR numbers (state the durable fact instead; git blame keeps the provenance):\n${report}`,
  );
});

test('the scan reads real comments rather than reporting an empty sweep', async () => {
  // A gate whose traversal or pattern silently matches nothing passes on any repository. This is
  // the same guard the markdown link checker carries, and for the same reason: the first mutation
  // test written against that checker reported success because the mutation had never landed.
  const files = await sourceFiles(REPO_ROOT);
  assert.ok(files.length > 100, `expected the repository's sources to be found, saw ${files.length}`);

  const comments = (await Promise.all(files.map(async (file) =>
    (await readFile(file, 'utf8')).split('\n').filter((line) => COMMENT_LINE.test(line)).length)))
    .reduce((total, count) => total + count, 0);
  assert.ok(comments > 500, `expected to have inspected many comment lines, saw ${comments}`);
});
