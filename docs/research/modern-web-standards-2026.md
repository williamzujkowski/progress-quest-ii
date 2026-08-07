# ProgQuest modernization standards research (2026)

**Research date:** 2026-08-02

**Scope:** React 19 / Vite 8 / TypeScript 6 static PWA, with local saves and GitHub Pages deployment

**Evidence policy:** primary sources only: W3C/WAI standards, OWASP guidance, official React/TypeScript/npm/GitHub/Chrome documentation, and first-party project source.

## Executive recommendation

ProgQuest has a sound small-app foundation: strict TypeScript, deterministic seeded engine behavior, Zod validation and explicit size bounds at save boundaries, a read-only-reference legacy baseline, Vitest tests, Playwright flows, axe scans, `npm ci`, and least-privilege CI permissions. Preserve that simplicity.

The next modernization tranche should establish four missing product contracts before adding more game features:

1. **Recoverable and diagnosable runtime:** a React error boundary, safe global unexpected-error capture, typed bounded diagnostic events, a user-safe recovery screen, and opt-in diagnostic export.
2. **Actual PWA behavior:** a manifest plus a versioned, same-origin service worker that makes the app shell and current local game usable offline, with update and rollback tests.
3. **WCAG 2.2 AA interaction behavior:** modal focus containment/restoration, target-size and focus-obscuration checks, and explicit control of auto-updating game content.
4. **Reproducible, reviewable delivery:** immutable GitHub Action references, dependency review, provenance/signature checks where practical, and an attested deploy artifact.

Do not add a telemetry vendor, service-worker framework, generalized event bus, worker-based engine, or multi-package architecture yet. The current app is about 2,300 source lines; native browser/React facilities and a few small typed modules are enough.

## Current-state findings

| Surface | Existing strengths | Observed gap / risk |
| --- | --- | --- |
| Engine accuracy | `src/engine/` is UI-independent; seeded PRNG behavior is tested; `pq-web-src/` is retained as the authoritative reference. | Tests cover selected math and store transitions but not a canonical multi-step trace against legacy behavior. Changes can remain deterministic while still drifting from Progress Quest mechanics. |
| Save safety | `decodePQWSave` limits input to 1 MB, parses through `unknown`, validates with Zod, and fails without mutating the active session. Roster reads revalidate entries. | Storage/theme read failures are silently swallowed, and clipboard failure is not handled. Users and maintainers cannot distinguish expected capability loss from a defect. Local storage must continue to be treated as untrusted. |
| Runtime recovery | React `StrictMode` is enabled and save operations expose typed result errors. | No React error boundary, global `error`/`unhandledrejection` policy, diagnostic model, build identifier, or recovery/export surface exists. A render exception can blank the app. The flavor-text activity log is not an operational log. |
| PWA | Static, same-origin app and local state are a good offline fit; GitHub Pages provides HTTPS. | No web app manifest, service-worker registration, offline shell, install icons, cache version policy, update UX, or offline E2E test exists. The mission currently promises PWA/offline support that the shipped app does not provide. |
| Accessibility | Semantic headings/regions, skip link, keyboard-focusable scroll regions, responsive tests, three-theme axe checks, and a visible pause control exist. | Axe is run with WCAG 2.0/2.1 tags only. Both modal implementations omit initial focus, focus containment, `Escape`, inert background, and focus restoration. Auto-updating behavior needs a WCAG 2.2 test contract. |
| Performance | Small static site; no API waterfall; assets are local. | No Core Web Vitals measurement or budget. The current `dist/` is about 703 KB uncompressed: about 362 KB JavaScript and 303 KB WOFF2 fonts. Both complete variable-font CSS entry points cause many language subsets to be emitted, though an English session will not necessarily request all of them. |
| Type maintainability | `strict`, unused checks, `verbatimModuleSyntax`, project references, and zero-`any` policy are already present. | `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are not enabled. The character creator's guarded `seedHistory[seedHistory.length - 1]` is representative of indexed access whose possible absence is not modeled. |
| Browser QA | Nineteen deterministic Chromium E2E tests cover saves, themes, accessibility, dense state, and 320/375/768 px layouts. | Only Desktop Chrome runs. PWA, storage failure, clipboard rejection, corrupted cached build, dialog focus lifecycle, reduced motion, high contrast/forced colors, and WebKit mobile behavior are not covered. |
| CI / supply chain | `npm ci`, unit/E2E/build/audit gates, `contents: read` for CI, and narrowly scoped Pages permissions are good. | Actions use mutable major tags (`@v4`, `@v3`); no dependency-review gate, Dependabot config, package signature/provenance verification, SBOM, artifact attestation, or CodeQL workflow is present. |
| Vestigial surface | Legacy baseline is clearly separated and intentionally retained; unreferenced Vite/React starter logos were removed under #23. | `App.css` contains historical/duplicated styling and many component inline styles remain, increasing visual-regression and CSP maintenance cost. (The `src/assets/hero.png` noted here has since been removed along with the rest of that directory; the `**/assets` entries in `.oxlintrc.json` are kept deliberately, as a guard against the engine reaching for one if it returns.) |

## Standard-backed modernization plan

### P0 — Preserve game accuracy with executable contracts

Create a compact, versioned engine trace contract before refactoring the tick loop:

- Given an explicit seed and character creation request, record a fixed sequence of tasks, RNG state, inventory/gold/quest/plot/level changes, and ordered activity events.
- Derive the expected vectors by running or carefully transcribing the authoritative `pq-web-src/` logic, then keep the vectors in tests rather than duplicating formulas in test code.
- Add invariant/property tests for non-negative bounded progress, task duration, inventory aggregation, encumbrance, save round trips, and deterministic replay.
- Include a `saveVersion` only when migration is implemented; do not silently reinterpret existing data. Any future serialization break requires the repository's unanimous vote gate.

This is a project-specific correctness requirement, not a web-platform requirement. It should precede performance refactors because a faster wrong simulation violates ProgQuest's prime directive.

### P0 — Establish a typed recovery and diagnostic contract

React documents that render failures are caught by Error Boundaries rather than parent `try/catch`, and that production errors caught by a boundary do not also bubble to `window` ([React Error Boundary guidance](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary), [React error-boundaries lint rule](https://react.dev/reference/eslint-plugin-react-hooks/lints/error-boundaries)). The platform separately exposes synchronous/resource failures through `error` and unhandled promise failures through `unhandledrejection` ([MDN `error`](https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event), [MDN `unhandledrejection`](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event)). Use all three seams without double-reporting:

- Add one app-root Error Boundary with a themed, keyboard-operable recovery screen: retry render, reload, open save manager if safe, copy a sanitized diagnostic report, and reset only after explicit confirmation.
- Define a small discriminated `DiagnosticEvent` contract: timestamp, severity, stable code, subsystem (`engine`, `storage`, `audio`, `ui`, `pwa`), app version/commit, operation, outcome, and a generated interaction ID. Preserve the thrown cause in development, but do not render stack traces to users.
- Keep a bounded in-memory ring (for example 100 events). Persisting diagnostics or sending telemetry is a separate privacy decision; do neither by default. Export only on explicit user action.
- Route expected failures (storage unavailable/quota, clipboard denied, audio context rejected, invalid save, service-worker update failure) through typed results/status messages. Reserve the boundary/global handlers for unexpected failures.
- Sanitize CR/LF/delimiters on export and redact save payloads, character names, filesystem paths, tokens, URLs with query strings, and stack details unless the user deliberately opts into a developer report.

OWASP recommends an application-wide handler, sufficient `when/where/who/what` event attributes, input sanitization to prevent log injection, and exclusion/masking of secrets and personal data ([OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)). It also recommends generic user-facing unexpected-error responses while retaining technical detail for investigation ([OWASP Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)). For this client-only game, “retain” should mean the bounded local diagnostic/export path unless a future, consented backend is added.

Acceptance tests should inject a render error, rejected clipboard promise, disabled/quota-failing storage, rejected audio resume, and unhandled promise; assert that the session is not silently destroyed and the user receives an accessible status/recovery path.

### P0 — Ship a minimal, update-safe PWA

The current W3C manifest specification defines installation metadata and installed top-level behavior ([Web Application Manifest](https://www.w3.org/TR/appmanifest/)). Current browser guidance requires a manifest with a name/short name, 192 px and 512 px icons, `start_url`, and `display` metadata for Chromium promotion, served over HTTPS or local development ([MDN installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)). A service worker is no longer universally required for installation, but it is the platform mechanism for the offline behavior promised by this project ([Service Workers specification](https://www.w3.org/TR/service-workers/), [MDN offline operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)).

Implement the smallest complete slice:

- Add a standards-based manifest with `start_url: "./"`, `scope: "./"`, `display: "standalone"`, theme/background colors, and purpose-appropriate 192/512 icons. Relative scope is important because production lives below the GitHub Pages origin path and Vite uses `base: './'`.
- Generate a content-versioned same-origin worker at build time. Precache only the built app shell/fonts/icons required to start; use cache-first for immutable hashed assets and navigation fallback to the cached shell. Clean old named caches on activation.
- Keep saves in the existing validated storage boundary; do not put user save data in Cache Storage. Test a fresh online visit, reload offline, installed `start_url`, update from build A to B, and recovery from a deliberately stale cache.
- Surface “update available” and apply it only through a user action. Document a kill switch/unregister path.
- Test deployment from the real `/progress-quest-iii/` base path, not only Vite's root dev URL.

OWASP advises treating service workers as security-sensitive: same-origin HTTPS scripts, restricted scope, cache-busting/versioning, no sensitive-response caching, and a documented kill switch ([OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)). Prefer a native worker at this size. Add Workbox or `vite-plugin-pwa` only if cache-routing/update complexity demonstrably exceeds the small explicit implementation.

### P0 — Move the accessibility gate to WCAG 2.2 AA

WCAG 2.2 is the current W3C Recommendation and adds, among other criteria, Focus Not Obscured (Minimum) and Target Size (Minimum) at level AA ([WCAG 2.2](https://www.w3.org/TR/WCAG22/), [WAI summary of new 2.2 criteria](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)). Target Size requires a target of at least 24×24 CSS pixels or qualifying spacing ([SC 2.5.8 explanation](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)); focused controls must not be entirely hidden by author-created content ([SC 2.4.11 explanation](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)).

- Add `wcag22aa` to axe configuration and explicitly enable/review axe's currently disabled `target-size` rule; automated results do not replace keyboard/screen-reader review.
- Make both modal surfaces conform to the WAI-ARIA modal dialog pattern: focus enters the dialog, `Tab`/`Shift+Tab` stay inside, `Escape` closes, background content is inert, and focus returns to the opener ([WAI-ARIA APG modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)). Prefer the native `<dialog>` element if it meets the styling/browser contract; otherwise centralize the behavior in one tested primitive.
- Test 200% and 400% zoom/reflow, forced colors, `prefers-reduced-motion`, keyboard-only operation, focus visibility inside every internal scroller, and touch targets at 320 px.
- The simulation and activity feed update automatically. WCAG 2.2 SC 2.2.2 requires a mechanism to pause, stop, hide, or control the frequency of auto-updating parallel content ([Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)). Preserve and test the global Pause control, give it an unambiguous accessible state, and ensure pausing stops visual/activity updates while leaving navigation and save/export usable. Review whether `aria-live="polite"` on the entire reordered log over-announces; announce only the new status event if screen-reader testing confirms the problem.
- Add WebKit to a small smoke subset (load, create, import/export, modal keyboard lifecycle, offline restart). Keep the dense visual matrix on Chromium unless a WebKit-specific failure justifies duplicating it.

### P0 — Harden the delivery supply chain

The workflows already use `npm ci` and minimal token permissions. Keep those. GitHub's secure-use guidance says a full-length commit SHA is the only immutable way to reference an Action and recommends least-privilege `GITHUB_TOKEN` permissions ([GitHub Actions secure-use reference](https://docs.github.com/en/actions/reference/security/secure-use)).

- Pin every `uses:` reference in CI and deploy workflows to a reviewed full commit SHA, retaining the release tag in a comment. Configure Dependabot for both `npm` and `github-actions` so these pins remain maintainable.
- Add dependency review on pull requests and enable Dependabot alerts/security updates. GitHub describes dependency review as the PR-time view of added/removed dependencies and their vulnerability impact ([GitHub dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review)).
- Keep `npm audit --audit-level=high`, but do not treat it as integrity verification. Add periodic `npm audit signatures`; npm documents that it verifies registry signatures and provenance attestations and fails on missing/invalid evidence ([npm package provenance](https://docs.npmjs.com/viewing-package-provenance/)). Initially run this as an auditable scheduled/reporting job because ecosystem packages may lack attestations; promote it to blocking only after measuring compatibility.
- Generate an SPDX or CycloneDX SBOM from the lockfile for releases (`npm sbom` supports both formats) ([npm SBOM](https://docs.npmjs.com/cli/v11/commands/npm-sbom/)).
- Attest the exact `dist` artifact deployed to Pages, and verify the attestation in the release/deploy process. GitHub artifact attestations bind repository, workflow, commit, trigger, and artifact and can include an SBOM ([GitHub artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations), [generation guide](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)). SLSA defines Build L1 as provenance and Build L2 as signed provenance generated by a hosted platform; provenance only produces security value when consumers verify it ([SLSA v1.2 build levels](https://slsa.dev/spec/v1.2/build-track-basics), [verification guidance](https://slsa.dev/spec/v1.2/verifying-artifacts)). Aim for a verified Build L2-style artifact before considering reusable-workflow/L3 complexity.
- Enable CodeQL default setup for JavaScript/TypeScript and workflow analysis. Do not add secrets to ordinary PR jobs or switch to `pull_request_target`.

### P1 — Define the browser security baseline

The app renders imported text through React text nodes and has no `dangerouslySetInnerHTML`, `eval`, remote script, or API endpoint today. That is a favorable baseline. Preserve it with a regression policy:

- Treat localStorage and future IndexedDB data as hostile on every read. OWASP states that XSS can read or modify browser storage and recommends never treating it as trusted; sensitive/authentication data does not belong there ([OWASP HTML5 storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)). Current Zod validation is correct; extend the schema with cross-field invariants such as `elapsedMs <= durationMs`, progress bounds relative to maxima, unique/normalized roster identity, and finite-number checks as the domain contract is clarified.
- Establish and test a Content Security Policy appropriate to a self-hosted Vite bundle: start in report-only where response headers are configurable, remove avoidable inline styling, then enforce at least same-origin scripts/resources, `object-src 'none'`, `base-uri 'none'`, restricted `connect-src`, `form-action`, and anti-framing policy. OWASP recommends strict nonce/hash policies where possible and a self-only fallback that denies unnecessary sources ([OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)). GitHub staff state that Pages does not presently support repository-configured custom response headers ([GitHub Pages header discussion](https://github.com/orgs/community/discussions/54257#discussioncomment-5767346)); explicitly document which directives can be delivered through an HTML meta policy and which require a proxy or different host. Changing host is a separate decision.
- Add automated checks that the production page loads no third-party scripts and that imported strings remain text, not markup. Review every future third-party script because it executes with the app's DOM/storage authority ([OWASP Third-Party JavaScript Management](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html)).
- Publish `SECURITY.md` with supported version, private reporting route, expected response, and the statement that character saves remain local unless a future feature explicitly says otherwise.

### P1 — Add performance budgets and field-ready measurement seams

Core Web Vitals are LCP, INP, and CLS. “Good” thresholds are LCP ≤2.5 s, INP ≤200 ms, and CLS ≤0.1 at the 75th percentile ([Google's current threshold methodology](https://web.dev/articles/defining-core-web-vitals-thresholds), [Web Vitals overview](https://web.dev/articles/vitals)).

- Record a reproducible mobile lab baseline against the built preview, not the Vite dev server: cold load, warm service-worker load, and dense long-running state. Set budgets for JS/CSS/font bytes, LCP, total blocking time as a lab diagnostic, and CLS. A reasonable first budget is “do not regress from measured main” until representative targets are captured.
- Measure engine work separately from React render work. The 50 ms interval currently triggers `tick` continuously; use browser profiles and React Profiler before introducing a Worker or changing cadence. Optimize only demonstrated long tasks or excessive commits.
- The official `web-vitals` library is about 2 KB Brotli and measures LCP/INP/CLS with Chrome-compatible semantics; its attribution build helps diagnose poor field results ([GoogleChrome `web-vitals` source](https://github.com/GoogleChrome/web-vitals)). Create an optional reporting callback seam, but keep it local/no-op until the project adopts a privacy policy and endpoint. Do not log metrics on every change in production.
- Import only required font subsets/weights or choose a system-font fallback after visual review. Web font guidance recommends minimizing families, subsetting glyphs, and using preload sparingly because fonts can delay LCP and contribute to CLS ([web.dev font best practices](https://web.dev/articles/font-best-practices), [font subsetting/preload guidance](https://web.dev/learn/performance/optimize-web-fonts)). First verify network requests: emitted files are not necessarily downloaded.
- Add explicit dimensions/aspect ratio for any future content image and test cached/offline font behavior.

### P1 — Tighten TypeScript and module contracts incrementally

TypeScript's `strict` umbrella is already on and provides stronger correctness guarantees ([TypeScript `strict`](https://www.typescriptlang.org/tsconfig/strict.html)). Add the next flags one at a time with focused fixes:

- `noUncheckedIndexedAccess` adds `undefined` to undeclared/indexed values ([TypeScript docs](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html)). This is valuable for data-table lookups, inventory entries, random selection, and history stacks.
- `exactOptionalPropertyTypes` distinguishes an absent optional field from a present `undefined` value ([TypeScript docs](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html)). This matters for save migrations and discriminated requests.
- Retain project references and separate DOM, worker, and Node environments if a service worker is added. TypeScript recommends separate configs/references when an app combines DOM, worker, Node, and shared code because one config represents one environment ([TypeScript module/compiler guidance](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options)).

Do not split the 2,300-line app into packages. Instead, enforce existing layer direction with one static check: `src/engine` may import only engine/data modules and web-worker adapters must depend on an engine facade. Define deep public functions around session stepping, serialization, and diagnostics; avoid interfaces that have only one implementation.

### P2 — Remove vestigial code and make quality gates explicit

- Delete the three unreferenced starter/hero assets after confirming no documentation consumes them. Keep all of `pq-web-src/` because it is an intentional accuracy oracle, not dead production code.
- Consolidate component inline styles into existing semantic CSS classes while implementing CSP/accessibility changes; do not perform a standalone visual rewrite.
- Add a small “quality contract” document or README table listing local and CI commands, supported Node/npm range, browser smoke matrix, WCAG target, PWA offline scenario, performance budgets, and security reporting route.
- Add coverage only where it represents behavior risk: engine parity/invariants, save migration and corruption, diagnostics redaction/bounds, service-worker update/offline, and modal focus. A global percentage target would encourage low-value tests.
- Keep Nexus runtime, Playwright artifacts, coverage, local logs, and secrets ignored. Do not ignore generated source inputs needed for reproducible builds (manifest source, service-worker source, lockfile, SBOM policy, workflow pins).

## Recommended issue sequence

This report deliberately does not create issues, but the work should be decomposed in this order:

1. **Engine fidelity trace and invariant contract** — prerequisite for simulation refactors.
2. **Runtime error boundary and bounded diagnostic export** — includes clipboard/storage/audio error UX and redaction tests.
3. **Installable offline PWA with update/rollback contract** — manifest, icons, service worker, base-path and offline E2E.
4. **WCAG 2.2 AA gate and shared modal primitive** — focus lifecycle, target size, pause behavior, reduced-motion/forced-color review.
5. **Immutable and attested CI/deploy supply chain** — SHA pins, Dependabot/dependency review, signatures, SBOM, artifact attestation, CodeQL.
6. **Browser security baseline** — CSP deployment decision/tests, `SECURITY.md`, storage cross-field invariants.
7. **Performance baseline and budgets** — production-preview lab results, font request audit, optional no-op Web Vitals seam.
8. **TypeScript indexed/optional strictness** — enable flags in small compiling commits.
9. **WebKit/PWA/storage-failure smoke matrix** — keep only high-value cross-browser cases.
10. **Vestigial asset and style cleanup** — deletion/consolidation alongside the above work, not as an architectural project.

## Definition of modernized for this phase

The phase is complete when:

- A fixed seed reproduces a legacy-approved multi-step game trace.
- Invalid/corrupt saves and storage/capability failures never partially mutate or silently destroy the active session.
- Unexpected render and promise failures show a useful recovery screen and produce a bounded, redacted, user-exportable diagnostic report.
- The deployed `/progress-quest-iii/` app installs and starts offline after one successful visit, updates safely, and has a tested unregister/rollback route.
- Keyboard-only use, both modals, 320 px reflow, pause behavior, target sizes, and focus visibility meet the WCAG 2.2 AA contract across themes.
- Production-preview performance has versioned budgets and no Core Web Vital is knowingly outside the “good” threshold without a tracked disposition.
- Pull requests cannot introduce a known high-severity dependency, mutable Action reference, type error, failed fidelity vector, accessibility regression, or broken browser/offline smoke flow.
- The deployed artifact can be traced to and verified against its source commit/workflow.
