# Semantic GitHub Actions workflow linting

Date: 2026-08-04
Scope: [Progress Quest II issue #172](https://github.com/williamzujkowski/progress-quest-ii/issues/172)

## Recommendation

Use **`rhysd/actionlint` v1.7.12** through a repository-owned Node 22 launcher that downloads the matching official release archive, verifies a **hard-coded SHA-256 before extraction**, caches it in an ignored repository-local tool directory, and executes it without a global install or `npx`.

Run actionlint with `-shellcheck= -pyflakes=` so local and CI results do not depend on optional host binaries. This does not disable actionlint's built-in expression/script-injection rule. Add the declared script to `npm run quality`, and test the launcher against a committed invalid workflow fixture.

This is smaller and safer than adding a workflow-language framework or a stale npm wrapper. It gives the checks #172 actually needs: workflow structure, expression syntax and types, local/reusable workflow interfaces, action inputs where metadata is available, unsafe inline interpolation, credentials, permissions, runner labels, globs, cron, and dependency errors. These capabilities are documented by upstream. ([feature summary](https://github.com/rhysd/actionlint/blob/v1.7.12/README.md#L6-L20), [full check catalog](https://github.com/rhysd/actionlint/blob/v1.7.12/docs/checks.md#L4-L48))

## Comparison

| Option | Freshness and license | Relevant checks | Installation/supply-chain fit | Decision |
|---|---|---|---|---|
| `rhysd/actionlint` | v1.7.12, released 2026-03-30; MIT. ([release](https://github.com/rhysd/actionlint/releases/tag/v1.7.12), [license](https://github.com/rhysd/actionlint/blob/v1.7.12/LICENSE.txt)) | YAML/workflow schema, strongly typed expressions, local/reusable and popular-action inputs, unsafe untrusted expressions in inline scripts, hard-coded credentials, permissions; optional ShellCheck/Pyflakes. ([documented features](https://github.com/rhysd/actionlint/blob/v1.7.12/README.md#L8-L20), [script-injection example](https://github.com/rhysd/actionlint/blob/v1.7.12/README.md#L52-L82)) | Official archives and checksums exist for macOS, Linux, Windows, and FreeBSD across common x86/ARM architectures; release attestations are supported. ([install matrix](https://github.com/rhysd/actionlint/blob/v1.7.12/docs/install.md#L85-L116), [release checksums](https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_checksums.txt)) | **Choose.** |
| `mpalmer/action-validator` | Native v0.9.0 released 2026-04-09; GPL-3.0-only. Its npm `@action-validator/core` and `@action-validator/cli` remain at 0.6.0 from 2024. ([release](https://github.com/mpalmer/action-validator/releases/tag/v0.9.0), [license](https://github.com/mpalmer/action-validator/blob/v0.9.0/LICENCE), [npm core metadata](https://registry.npmjs.org/%40action-validator%2Fcore/0.6.0), [npm CLI metadata](https://registry.npmjs.org/%40action-validator%2Fcli/0.6.0)) | Validates YAML against bundled SchemaStore JSON schemas and checks whether path globs match repository files. It does not document expression type checking, external action-input validation, or script-injection analysis. ([scope](https://github.com/mpalmer/action-validator/blob/v0.9.0/README.md#L1-L7)) | v0.9.0 provides only macOS/Linux x64/ARM64 binaries, not Windows. Its composite action defaults to `latest`, downloads a binary without checksum verification, and writes globally under `/usr/local/bin`; upstream itself tells consumers to pin both action SHA and version. ([action installer](https://github.com/mpalmer/action-validator/blob/v0.9.0/action.yml#L1-L80), [pinning warning](https://github.com/mpalmer/action-validator/blob/v0.9.0/README.md#L118-L130)) | Reject: narrower checks, stale npm path, GPL, weaker artifact coverage. |
| GitHub `actions/languageservices` | `@actions/workflow-parser` / `@actions/languageservice` v0.3.60 released 2026-07-15; MIT; Node >=20. ([release](https://github.com/actions/languageservices/releases/tag/release-v0.3.60), [parser package](https://github.com/actions/languageservices/blob/release-v0.3.60/workflow-parser/package.json), [license](https://github.com/actions/languageservices/blob/release-v0.3.60/LICENSE)) | GitHub's parser validates against its schema, while the language service adds expression/context diagnostics and can use dynamic providers. ([parser interface](https://github.com/actions/languageservices/blob/release-v0.3.60/workflow-parser/README.md#L1-L45), [language-service model](https://github.com/actions/languageservices/blob/release-v0.3.60/languageservice/README.md#L15-L36)) | These are libraries/language-server building blocks, not a documented repo-wide lint CLI. A custom CLI, document adapter, configuration/providers, diagnostic formatting, and security rule would become this repository's maintenance burden. Upstream explicitly says it is one of multiple parser implementations and restricts major behavior changes. ([project scope](https://github.com/actions/languageservices/blob/release-v0.3.60/README.md#L1-L29), [parser scope](https://github.com/actions/languageservices/blob/release-v0.3.60/workflow-parser/README.md#L47-L53)) | Reject for this issue: authoritative parser, shallow local integration. |
| npm package `actionlint` | 2.0.6, last modified 2022-12-07; MIT. ([registry metadata](https://registry.npmjs.org/actionlint/2.0.6)) | A WASM wrapper, not current upstream actionlint. | Lockfile integrity would be convenient, but it freezes an obsolete checker and adds a second maintainer/provenance path. | Reject, as #172 anticipated. |

## Pinning and launcher contract

Pin `VERSION = "1.7.12"`, the release URL prefix, and the reviewed archive digest map in source. At minimum, support the Node 22 desktop/CI targets below; fail closed on any unknown platform/architecture. The authoritative list contains additional 32-bit/FreeBSD builds. ([official checksum file](https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_checksums.txt))

| Node platform/architecture | Archive SHA-256 |
|---|---|
| `linux/x64` | `8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8` |
| `linux/arm64` | `325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6` |
| `darwin/x64` | `5b44c3bc2255115c9b69e30efc0fecdf498fdb63c5d58e17084fd5f16324c644` |
| `darwin/arm64` | `aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f` |
| `win32/x64` | `6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9` |
| `win32/arm64` | `cadcf7ea4efe3a68728893813643cebe1185e5b1d4be5b96245f65c9a4d5ea41` |

Launcher invariants:

1. Use Node's `process.platform`/`process.arch`, HTTPS fetch, `crypto` SHA-256, temporary directory, and atomic cache rename. Never interpolate workflow content into commands.
2. Verify the archive digest **before** extracting; reject redirects whose final host is not `github.com`/`release-assets.githubusercontent.com`, non-200 responses, oversized downloads, digest mismatch, missing executable, or `actionlint -version` mismatch.
3. Cache under an ignored path keyed by version/platform/architecture. A verified cached archive/binary permits later offline runs. A pristine clone cannot be fully offline unless the archives are vendored; vendoring roughly 2–2.5 MB per platform is unnecessary repository weight for a project whose first `npm ci` and Playwright install already require network access.
4. Do not use upstream's otherwise-convenient `bash <(curl .../main/scripts/download-actionlint.bash)`: it executes a mutable branch and the script downloads/extracts without checking a digest. ([official script](https://github.com/rhysd/actionlint/blob/v1.7.12/scripts/download-actionlint.bash), [documented convenience invocation](https://github.com/rhysd/actionlint/blob/v1.7.12/docs/install.md#L118-L144))
5. Do not use `go install ...@latest`, Homebrew, a global binary, a floating Docker tag, or an unpinned action wrapper. They make local and CI provenance differ.

GitHub artifact attestation can be an optional release-review step, not a runtime prerequisite; hard-coded reviewed digests are portable and keep the gate independent of an authenticated `gh` installation. Upstream's release workflow generates provenance attestations from the checksum manifest. ([release workflow](https://github.com/rhysd/actionlint/blob/v1.7.12/.github/workflows/release.yaml#L9-L36))

## Coverage caveat: immutable action SHAs

Actionlint validates local action metadata directly and embeds metadata for more than 100 popular actions, so it needs no network while linting. However, upstream documents that popular-action input validation recognizes major refs such as `@v4`, **not full version refs, branches, or immutable commit SHAs**. ([local inputs](https://github.com/rhysd/actionlint/blob/v1.7.12/docs/checks.md#L1766-L1827), [popular-action limitation](https://github.com/rhysd/actionlint/blob/v1.7.12/docs/checks.md#L1829-L1878))

Progress Quest II correctly pins third-party actions by commit SHA, so #172 should phrase this acceptance criterion honestly:

> Fail invalid workflow/reusable-workflow expressions and inputs, and invalid local/popular-action inputs where actionlint has metadata. Keep external actions SHA-pinned; do not weaken supply-chain policy merely to make input metadata recognition pass.

If validation of every external action's `with:` keys at immutable SHAs becomes mandatory, it requires a second, explicit tradeoff: fetch `action.yml` at each pinned SHA using an authenticated GitHub provider, or vendor reviewed metadata. That is networked or duplicated state and is not the smallest safe implementation for #172. GitHub's language service demonstrates this provider-based shape, but it adds materially more interface and maintenance than actionlint. ([language-service providers](https://github.com/actions/languageservices/blob/release-v0.3.60/languageservice/README.md#L17-L36))

## Negative contract

Keep one fixture outside `.github/workflows/` so GitHub never tries to execute it. It should contain an invalid key, malformed expression, unknown local/reusable input, and direct `${{ github.event.pull_request.title }}` interpolation under `run:`. A Node test must assert nonzero exit and the expected actionlint rule kinds. GitHub documents why direct expression substitution into a generated shell script is injectable and recommends moving untrusted values through an intermediate environment variable. ([GitHub script-injection guidance](https://docs.github.com/en/actions/concepts/security/script-injections))
