import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

/**
 * Every relative markdown link must resolve to something on disk.
 *
 * Eighty-nine of them stopped resolving in a single commit. Retiring the `pq-web-src` submodule was
 * a deliberate decision with its own ADR; what nobody did was follow the citations, and five
 * research notes were left pointing line-anchored evidence into a directory that no longer existed.
 * Nothing was watching, because nothing here had ever read a markdown link.
 *
 * That failure mode is worse than an ordinary stale document. This repository settles questions by
 * pointing at the line that decides them, so a link that cannot resolve still *looks* like evidence
 * and discourages the checking it can no longer support.
 *
 * Relative links only. External URLs are deliberately out of scope: there are several hundred, most
 * of them to github.com, and checking them would make this gate depend on the network and on other
 * people's rate limits. A gate that fails for reasons unrelated to the change under review teaches
 * people to re-run it until it passes, which is worse than not having it.
 */

const REPO_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

const SKIPPED_DIRECTORIES = new Set([
  'node_modules', '.git', 'dist', 'coverage', 'test-results', 'playwright-report', '.nexus-agents',
]);

/**
 * Vendored upstream text, excluded on purpose.
 *
 * Imported skills carry examples that are illustrative rather than real — `./src/ordering/CONTEXT.md`
 * in a domain-modelling walkthrough, a literal `](link)` placeholder in a template. Those are
 * correct upstream and would be false positives here. They also must not be "fixed": AGENTS.md and
 * `.agents/skills/PROVENANCE.md` require imports to be refreshed through the upstream workflow
 * rather than edited in place, so a gate demanding edits there would order a rule violation.
 */
const VENDORED = '.agents/skills/';

const MARKDOWN_LINK = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

async function markdownFiles(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await markdownFiles(path));
    else if (entry.name.endsWith('.md')) found.push(path);
  }
  return found;
}

export async function findBrokenRelativeLinks(root) {
  const broken = [];
  for (const file of await markdownFiles(root)) {
    const repoPath = relative(root, file);
    if (repoPath.startsWith(VENDORED)) continue;
    const text = await readFile(file, 'utf8');
    for (const [, target] of text.matchAll(MARKDOWN_LINK)) {
      // Anchors, absolute URLs and mail links are not paths on disk.
      if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target) || target.startsWith('#')) continue;
      // The fragment is a heading or line anchor, not part of the filename.
      const [pathPart] = target.split('#');
      if (!pathPart) continue;
      let decoded;
      try {
        decoded = decodeURIComponent(pathPart);
      } catch {
        // A link that is not decodable is malformed, which is itself worth failing on.
        broken.push({ file: repoPath, target });
        continue;
      }
      try {
        await access(resolve(dirname(file), decoded));
      } catch {
        broken.push({ file: repoPath, target });
      }
    }
  }
  return broken;
}

test('every relative markdown link resolves', async () => {
  const broken = await findBrokenRelativeLinks(REPO_ROOT);
  const report = broken.map(({ file, target }) => `  ${file} -> ${target}`).join('\n');
  assert.deepEqual(broken, [], `Unresolvable relative markdown links:\n${report}`);
});

test('the checker reads links rather than reporting an empty scan', async () => {
  // A link checker that silently matches nothing passes on any repository, including a broken one.
  // This asserts the scan has real work in it, so a regex or traversal fault fails here instead of
  // being reported as a clean run.
  const files = await markdownFiles(REPO_ROOT);
  assert.ok(files.length > 50, `expected the repository's markdown to be found, saw ${files.length}`);

  const links = (await Promise.all(files.map(async (file) =>
    [...(await readFile(file, 'utf8')).matchAll(MARKDOWN_LINK)].length))).reduce((a, b) => a + b, 0);
  assert.ok(links > 200, `expected to have inspected many links, saw ${links}`);
});
