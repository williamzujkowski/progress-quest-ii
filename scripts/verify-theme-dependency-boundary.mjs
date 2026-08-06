import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'vite';

/**
 * Proves the terminal-theme package's build-only colour tooling stays out of the shipped bundle.
 *
 * `@williamzujkowski/oklch-terminal-themes` installs `apca-w3` and its transitive `colorparsley`
 * as production dependencies. This project imports only theme data, so they tree-shake away — but
 * "we looked and did not see them" is an audit, not a guarantee, and an audit stops being true
 * the moment an import changes.
 *
 * Grepping the minified output for their exported names would be the easy check and a weak one:
 * a bundler is free to rename what it inlines, so absence of a symbol is not absence of the code.
 * This asks the bundler instead. A rollup build reports every module it actually included, by
 * real path, before anything is minified — which is the difference between asking whether the
 * evidence is visible and asking what happened.
 *
 * Upstream is expected to fix the boundary at source (#178, tracking their issue 169). Until
 * then this holds the line from here.
 */

const FORBIDDEN = ['apca-w3', 'colorparsley'];

test('no build-only colour tooling reaches the production bundle', async () => {
  const result = await build({
    logLevel: 'silent',
    build: { write: false, sourcemap: false, minify: false },
  });

  const outputs = Array.isArray(result) ? result : [result];
  const modules = new Set();
  for (const bundle of outputs) {
    for (const chunk of bundle.output ?? []) {
      for (const id of Object.keys(chunk.modules ?? {})) modules.add(id);
    }
  }

  assert.ok(modules.size > 0, 'The verification build reported no modules, so it proved nothing.');

  const included = [...modules].filter((id) =>
    FORBIDDEN.some((name) => id.includes(`node_modules/${name}/`)));

  assert.deepEqual(
    included,
    [],
    `Build-only colour tooling was bundled into the shipped output:\n${included.join('\n')}\n`
      + 'Importing anything beyond theme data from the terminal-theme package pulls it in. See #178.',
  );
});
