# GitHub Actions Node.js 24 migration

**Research date:** 2026-08-03
**Scope:** issue [#98](https://github.com/williamzujkowski/progquest/issues/98), `.github/workflows/ci.yml`, and `.github/workflows/deploy.yml`
**Evidence policy:** first-party GitHub documentation, release notes, and action source only

## Recommendation

Move to the current releases below. Pin the reviewed commits, retaining the release tag in a comment. GitHub says a full commit SHA is the only immutable way to reference an action ([secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use#using-third-party-actions)).

| Action | Minimum Node 24-backed major | Recommended exact pin |
| --- | ---: | --- |
| `actions/checkout` | v5 | `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1` |
| `actions/setup-node` | v5 | `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0` |
| `actions/configure-pages` | v6 | `actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d # v6.0.0` |
| `actions/upload-pages-artifact` | v5 | `actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0` |
| `actions/deploy-pages` | v5 | `actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128 # v5.0.0` |

GitHub changed the runner default to Node 24 on June 16, 2026 and tells action users to adopt current releases that declare Node 24 ([GitHub deprecation notice](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/)). The `node-version: 22` workflow input selects ProgQuest's build/test Node version; it is independent of the Node 24 runtime embedded in the actions and should remain `22` for this maintenance issue.

Recommended invocations:

```yaml
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  with:
    persist-credentials: false
    submodules: recursive

- uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
  with:
    node-version: 22
    cache: 'npm'
    package-manager-cache: false
```

Use those two steps in both workflows. In deploy, use:

```yaml
- uses: actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d # v6.0.0

- uses: actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0
  with:
    path: './dist'
    include-hidden-files: false

- id: deployment
  uses: actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128 # v5.0.0
```

Keep build, test, configuration, and artifact upload in a read-only `build` job with `contents: read` and the `pages: read` required by configure-pages. Make the environment-bound `deploy` job depend on it and grant `pages: write` plus `id-token: write` only to that job. Set `persist-credentials: false` on checkout because neither workflow performs an authenticated Git operation after checkout. This follows GitHub's standard Pages permission boundary and keeps package scripts outside the privileged deployment job.

`include-hidden-files: false` makes the new secure default explicit. The current `dist` has no dotfiles, so this does not change the deployed bundle observed on the research date. If a required file such as `.nojekyll` is later added to `dist`, change this input deliberately to `true`; `.git` and `.github` remain excluded by the action.

## Migration findings

### `actions/checkout`: v4 to v7.0.1

- v5 is the first Node 24 runtime and requires Actions Runner v2.327.1 or later ([v5.0.0 release](https://github.com/actions/checkout/releases/tag/v5.0.0)).
- v6 moves persisted credentials from `.git/config` to a separate file under `$RUNNER_TEMP`. Ordinary authenticated Git commands continue to work; Docker container actions need runner v2.329.0 or later to access them ([v7 README, v6 migration note](https://github.com/actions/checkout/blob/v7.0.1/README.md#checkout-v6)). Neither workflow uses a Docker action after checkout.
- v7 refuses fork PR code by default for `pull_request_target` and `workflow_run`, with an escape hatch named `allow-unsafe-pr-checkout`. ProgQuest uses `pull_request`, `push`, and `workflow_dispatch`, so no input is needed ([v7 README](https://github.com/actions/checkout/blob/v7.0.1/README.md#checkout-v7)). v7.0.1 includes the follow-up fix that skips the unsafe-PR check when the input is left at its default ([v7.0.1 release](https://github.com/actions/checkout/releases/tag/v7.0.1)).
- Keep `submodules: recursive` and set `persist-credentials: false`; neither workflow needs authenticated Git commands after checkout.

### `actions/setup-node`: v4 to v7.0.0

- v5 is the first Node 24 runtime, requires runner v2.327.1, and introduces automatic package-manager caching as a breaking default ([v5.0.0 release](https://github.com/actions/setup-node/releases/tag/v5.0.0)).
- v6 limits automatic detection to npm projects whose `package.json` declares npm in `packageManager` or `devEngines.packageManager`; it also removes the deprecated `always-auth` input ([v7 README migration notes](https://github.com/actions/setup-node/blob/v7.0.0/README.md#breaking-changes-in-v6)). ProgQuest uses neither package declaration nor `always-auth`.
- v7 migrates the action implementation to ESM; this does not change these workflow inputs ([v7.0.0 release](https://github.com/actions/setup-node/releases/tag/v7.0.0)).
- Preserve `cache: 'npm'`: this explicitly caches npm's global package data using the root lockfile, not `node_modules` ([setup-node caching documentation](https://github.com/actions/setup-node/blob/v7.0.0/README.md#caching-global-packages-data)). Add `package-manager-cache: false` to prevent a future `packageManager` field from silently selecting caching. The v7 source checks explicit `cache` first, so `false` disables only auto-detection and does not disable the existing npm cache ([v7 cache branch](https://github.com/actions/setup-node/blob/v7.0.0/src/main.ts#L70-L88)).
- Setup-node's maintainers warn that unnecessary automatic caching in privileged workflows raises cache-poisoning risk ([official security update](https://github.com/actions/setup-node/pull/1567)). ProgQuest further limits that exposure by running setup-node and package scripts only in the read-only `build` job; the privileged `deploy` job consumes the completed artifact without checking out or executing repository code.

### GitHub Pages actions

- `configure-pages@v6` is the first Node 24 release ([v6.0.0 release](https://github.com/actions/configure-pages/releases/tag/v6.0.0)). The intervening v5 break only drops Next.js below 13.3 when `static_site_generator: next` is used; this bare Vite invocation is unaffected ([v5.0.0 release](https://github.com/actions/configure-pages/releases/tag/v5.0.0)). No input is required.
- `upload-pages-artifact@v4` stopped including dotfiles. v5 adds `include-hidden-files` and replaces its internal uploader with `actions/upload-artifact@v7` ([v4.0.0 release](https://github.com/actions/upload-pages-artifact/releases/tag/v4.0.0), [v5.0.0 release](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0)). Its v5 composite source pins `upload-artifact@v7.0.0`, which declares Node 24, so adopting v5 also removes the run's transitive `actions/upload-artifact@v4` Node 20 annotation ([v5 action definition](https://github.com/actions/upload-pages-artifact/blob/v5.0.0/action.yml), [upload-artifact v6 Node 24 migration](https://github.com/actions/upload-artifact/releases/tag/v6.0.0)). Keep `path: './dist'` and explicitly exclude hidden files as above.
- `deploy-pages@v5` changes its action runtime to Node 24 and retains the existing default token, artifact name, timeout, polling, and `page_url` output contract ([v5.0.0 release](https://github.com/actions/deploy-pages/releases/tag/v5.0.0), [v5 action definition](https://github.com/actions/deploy-pages/blob/v5.0.0/action.yml)). Keep `id: deployment`; no inputs are required.

## Compatibility and verification

All jobs use GitHub-hosted `ubuntu-latest`; the self-hosted minimum-runner constraints therefore require no repository change. If these workflows are copied to self-hosted runners, use at least v2.329.0 because checkout v6+ credential access from Docker actions is the highest stated requirement.

After implementation, verify that CI and Pages pass, the completion annotation names no Node 20-targeting action, the uploaded artifact contains the expected `dist` files, `steps.deployment.outputs.page_url` resolves, and the live bundle corresponds to the deployed commit. No workflow was edited as part of this research.
