import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

/**
 * The job that builds the deployed artifact must not run the agent tooling.
 *
 * `nexus-agents` is 209 of the 421 packages in the lockfile; the production runtime tree is 14. It
 * is a development tool and nothing it does reaches a user. But `npm run quality` used to begin
 * with `npm run agents:verify`, and the deploy workflow runs `quality` in the same job that goes on
 * to build `dist/` and upload it as the Pages artifact — which is then attested.
 *
 * `npm ci --ignore-scripts` is already used everywhere and stops *install-time* execution. It does
 * nothing about *runtime* execution, and `verify` is runtime execution: it loads core modules and
 * native bindings, writes to a home directory, and probes three authenticated adapters. The
 * attestation would still be true, and would still be attesting a job in which all of that ran.
 *
 * Asserted from the files rather than trusted, because the coupling is easy to reintroduce: adding
 * a step to `quality` is the natural place to put a new check, and `quality` is what deploy runs.
 * The failure mode is invisible — everything passes either way — which is the shape of control this
 * repository has been bitten by more than once.
 */

const AGENT_SCRIPT = 'agents:verify';

/** The scripts a deploy job may run without dragging development tooling in behind them. */
const DEPLOY_ENTRY_POINTS = ['quality', 'build'];

async function packageScripts() {
  return JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).scripts;
}

/** Everything an npm script reaches, following `npm run <name>` transitively. */
function reachable(scripts, name, seen = new Set()) {
  if (seen.has(name)) return seen;
  seen.add(name);
  for (const match of (scripts[name] ?? '').matchAll(/npm run ([\w:-]+)/g)) {
    reachable(scripts, match[1], seen);
  }
  return seen;
}

test('the agent tooling is not reachable from anything the deploy job runs', async () => {
  const scripts = await packageScripts();
  assert.ok(scripts[AGENT_SCRIPT], `package.json no longer defines ${AGENT_SCRIPT}; this gate is checking nothing.`);

  for (const entry of DEPLOY_ENTRY_POINTS) {
    assert.ok(scripts[entry], `package.json no longer defines ${entry}; this gate is checking nothing.`);
    const reached = reachable(scripts, entry);
    assert.ok(
      !reached.has(AGENT_SCRIPT),
      `"${entry}" reaches "${AGENT_SCRIPT}", and the deploy job runs "${entry}" in the same job that `
      + 'builds and uploads the Pages artifact. Run it as its own step in ci.yml instead.',
    );
  }
});

test('the deploy workflow never invokes the agent tooling directly either', async () => {
  const deploy = await readFile(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  // Proves the file was read and is the one intended, so a rename cannot turn this into a pass.
  assert.match(deploy, /upload-pages-artifact/, 'deploy.yml no longer uploads a Pages artifact; this gate has gone stale.');
  assert.ok(
    !deploy.includes(AGENT_SCRIPT) && !deploy.includes('nexus-agents'),
    `deploy.yml invokes the agent tooling directly. It belongs in ci.yml, away from the deployed bytes.`,
  );
});

test('it still runs somewhere, or it has stopped being a gate', async () => {
  // Removing the coupling is only correct if the check survives it. Deleting the step would also
  // satisfy the two assertions above, which is exactly the wrong way to make them pass.
  const ci = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.ok(
    ci.includes(`npm run ${AGENT_SCRIPT}`),
    `ci.yml no longer runs ${AGENT_SCRIPT}. It was moved out of the deploy path, not abandoned.`,
  );
});
