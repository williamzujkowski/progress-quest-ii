import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

/**
 * Every job in the CI workflow must sit inside the one required status check.
 *
 * Branch protection requires a single context by name, `quality`. That is a good arrangement — it
 * does not have to be hand-edited whenever a job is added — but it only holds while every job is
 * reachable from `quality` through `needs`. A job outside that graph can fail on a red cross while
 * the pull request stays mergeable.
 *
 * This has now happened twice. Moving the WebKit suite into its own job took it outside the gate,
 * and folding it back in exposed that `dependency-review` had never been inside one either: a pull
 * request adding a dependency with a known advisory would go red and merge anyway.
 *
 * Both were invisible because the passing path is identical either way. Nothing fails until
 * something else fails, which is the worst shape a control can have — it looks correct for exactly
 * as long as it is never needed.
 *
 * So the invariant is asserted from the workflow itself rather than trusted: reachability is a
 * property of the file, checkable offline, and it fails the moment a job is added outside the
 * graph rather than the first time that job would have caught something.
 */

const WORKFLOW = new URL('../.github/workflows/ci.yml', import.meta.url);

/** The job branch protection names. Everything else has to be reachable from it. */
const GATE_JOB = 'quality';

/**
 * Parses job names and their `needs` from the workflow.
 *
 * Line-oriented rather than a YAML dependency, because the shape being read is narrow and fixed:
 * job names are the only two-space-indented keys under `jobs:`, and `needs` is either a flow
 * sequence or a single name. Ponytail rung 5 — a parser for the whole language would be a larger
 * commitment than the thing it checks.
 */
export function parseJobs(yaml) {
  const lines = yaml.split('\n');
  const jobsIndex = lines.findIndex((line) => line === 'jobs:');
  assert.ok(jobsIndex >= 0, 'ci.yml declares no jobs block');

  const jobs = new Map();
  let current = null;
  for (const line of lines.slice(jobsIndex + 1)) {
    const jobName = /^ {2}([A-Za-z][\w-]*):\s*$/.exec(line);
    if (jobName?.[1]) {
      current = jobName[1];
      jobs.set(current, []);
      continue;
    }
    const needs = /^ {4}needs:\s*(.+)$/.exec(line);
    if (needs?.[1] && current) {
      const value = needs[1].trim();
      const names = value.startsWith('[')
        ? value.slice(1, value.lastIndexOf(']')).split(',')
        : [value];
      jobs.set(current, names.map((name) => name.trim()).filter(Boolean));
    }
  }
  return jobs;
}

function reachableFrom(jobs, start) {
  const seen = new Set();
  const queue = [start];
  while (queue.length > 0) {
    const job = queue.pop();
    if (!job || seen.has(job)) continue;
    seen.add(job);
    queue.push(...(jobs.get(job) ?? []));
  }
  return seen;
}

test('every CI job is reachable from the required status check', async () => {
  const jobs = parseJobs(await readFile(WORKFLOW, 'utf8'));
  assert.ok(jobs.has(GATE_JOB), `ci.yml declares no ${GATE_JOB} job for branch protection to require`);

  const covered = reachableFrom(jobs, GATE_JOB);
  const orphaned = [...jobs.keys()].filter((job) => !covered.has(job));
  assert.deepEqual(
    orphaned,
    [],
    `These jobs can fail without blocking a merge, because branch protection requires only `
    + `"${GATE_JOB}" and nothing depends on them:\n${orphaned.map((job) => `  ${job}`).join('\n')}`,
  );
});

test('the gate job reads the result of every job it depends on', async () => {
  // Reachability alone is not enough. `needs` makes a job wait, and a dependency that fails leaves
  // the gate *skipped* rather than failed — so the gate reads each result explicitly and fails on
  // anything unexpected. A name added to `needs` without a matching result check would be waited
  // on and then ignored, which is the same hole one step further in.
  const yaml = await readFile(WORKFLOW, 'utf8');
  const dependencies = parseJobs(yaml).get(GATE_JOB) ?? [];
  assert.ok(dependencies.length > 0, `${GATE_JOB} depends on nothing, so it gates nothing`);

  for (const dependency of dependencies) {
    assert.ok(
      yaml.includes(`needs.${dependency}.result`),
      `${GATE_JOB} waits for ${dependency} but never reads its result, so its failure is ignored`,
    );
  }
  assert.ok(yaml.includes('if: always()'), `${GATE_JOB} must run even when a dependency fails, or it is skipped rather than red`);
});
