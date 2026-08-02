# Runtime resilience contract for ProgQuest

**Research date:** 2026-08-02  
**Scope:** React 19.2 / Vite 8 static application on GitHub Pages, with future offline/PWA support  
**Evidence policy:** primary or authoritative sources only (React, Vite, W3C/WAI, OWASP, GitHub, and web-platform documentation)

## Recommendation

Implement one small, dependency-free resilience layer before adding remote telemetry:

1. Put one error boundary around the application so a render failure becomes a themed recovery screen instead of an empty root.
2. Capture unexpected failures through React 19's root callbacks plus browser `error` and `unhandledrejection` listeners, and deduplicate at one typed recorder.
3. Keep at most 100 sanitized events in memory. Never persist or transmit them by default; let the user explicitly download a JSON report.
4. Correlate reports to the deployed commit with a non-secret build ID. Generate hidden source maps for a short-lived CI artifact, but remove them from the Pages artifact.
5. Add a conservative meta-delivered CSP now, while documenting the protections and reporting that GitHub Pages cannot deliver as response headers.
6. When the service worker is introduced, make its install/update/cache state observable through the same bounded event contract and a small typed `postMessage` boundary.

This is deliberately not a telemetry SDK, generalized event bus, persistent log database, or automatic crash uploader. ProgQuest is a small local-first game; native React and browser facilities cover the present requirement.

## Current repository state

The app bootstrap in `src/main.tsx` renders `<App />` inside `StrictMode`, but supplies no error boundary or React root error callbacks. There are no global unexpected-error listeners or operational diagnostic model. `src/state/gameStore.ts` bounds the *gameplay* activity feed to 50 strings, but that user-facing flavor text is not an operational log and should stay separate.

`vite.config.ts` sets the Pages-friendly relative base (`./`), while production source maps remain at Vite's default of `false`. The build has no commit/release identifier. No manifest or service worker is currently present. `index.html` has no CSP; the application loads scripts and fonts from the same origin, which is a strong starting point, although several React `style` props mean a strict style policy currently needs a narrow temporary allowance.

## Failure capture and recovery

React documents that an uncaught render error removes the affected UI and that only an Error Boundary—not a parent `try/catch`—can replace it with fallback UI. Boundaries do not catch event-handler errors, ordinary asynchronous callback failures, server rendering failures, or failures in the boundary itself ([React Error Boundary guidance](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)).

React 19 also exposes `onCaughtError`, `onUncaughtError`, and `onRecoverableError` as `createRoot` options, including component-stack context ([React `createRoot` error logging](https://react.dev/reference/react-dom/client/createRoot#error-logging-in-production)). Use those callbacks as the React reporting seam while the boundary owns only fallback state and recovery UI. This avoids scattering `componentDidCatch` logging across the component tree.

The web platform uses separate channels outside React: `window.error` covers synchronous script/event-handler failures (and resource-load failures when observed appropriately), while `unhandledrejection` covers promises that have no rejection handler ([Window `error`](https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event), [Window `unhandledrejection`](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event)). Do not call `preventDefault()` merely to hide console output. Record a sanitized event, preserve normal developer diagnostics, and deduplicate React/window overlap by a short-lived fingerprint or by marking already-seen `Error` objects in a `WeakSet`.

Expected capability failures are not crashes. Storage unavailability/quota, clipboard denial, invalid save input, rejected audio startup, and service-worker registration/update failures should remain typed result paths with visible status. Reserve boundary/root/global capture for defects and truly unexpected failures.

### Recovery-screen contract

The fallback should:

- replace the failed application with a semantic `<main>` and descriptive heading;
- move focus to that heading (`tabIndex={-1}`) because the previously focused node may have disappeared;
- explain that locally saved characters have not been deleted;
- offer native-button actions to retry the render, reload the page, and download diagnostics;
- never auto-reload, auto-clear data, expose a stack trace, or imply that a report was transmitted;
- require a separate explicit confirmation for any future “clear local data” action.

WCAG 2.2 requires status messages to be programmatically determinable without taking focus, but a full recovery view is a change of context, not a transient status message ([WCAG 2.2 SC 4.1.3](https://www.w3.org/TR/WCAG22/#status-messages), [WAI status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages)). Focus the recovery heading instead of adding a permanently assertive live region. Test keyboard order, visible focus, 320 px reflow, 200%/400% zoom, and contrast in every theme.

## Diagnostic event and privacy contract

Use one discriminated, JSON-serializable event shape with only bounded primitives:

```text
timestamp, severity, code, subsystem, operation, outcome,
buildId, interactionId, source, details?
```

- `code`, `subsystem`, `operation`, and `outcome` are controlled enums, not arbitrary messages.
- `buildId` is the deployed commit; `interactionId` is random per page lifetime and is not a stable user/device identifier.
- `details` is an allowlisted record with maximum key/value counts and lengths. Production capture should prefer exception type and static failure code over raw error messages.
- Exclude save strings, character names, inventory/activity content, local-storage values, full URLs/query strings, clipboard contents, tokens, source code, and filesystem paths.
- Strip CR, LF, and delimiter/control characters before JSON export. Treat every captured value—including browser error text—as untrusted.

OWASP recommends an application-wide logging handler, sufficient “when, where, who, what” attributes, sanitization against log injection, resource-exhaustion testing, and explicit exclusion or masking of secrets, identifiers, personal data, source code, and file paths ([OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)). For this anonymous local app, “who” should be the ephemeral interaction ID, never a character name or fingerprint.

Keep a fixed-size in-memory ring of 100 events; overwrite the oldest. The retention period is therefore the current page lifetime. Export only after the user activates “Download diagnostics,” with a preview/notice of the excluded data. A Blob download is a more dependable primary export than clipboard access; copying can be a convenience with a handled rejection. Persistent logs or remote reporting require a separate privacy decision, notice/consent model, deletion policy, and threat review.

## Build correlation and source maps

Inject `GITHUB_SHA` as an explicit non-secret compile-time constant during the deploy build. GitHub defines it as the commit SHA that triggered the workflow, and Vite's `define` option statically replaces JSON-serializable constants ([GitHub Actions variable reference](https://docs.github.com/en/actions/reference/workflows-and-actions/variables#default-environment-variables), [Vite shared `define` option](https://vite.dev/config/shared-options#define)). Do not use a `VITE_*` variable for secrets: Vite states those values are bundled into client code ([Vite environment security](https://vite.dev/guide/env-and-mode#env-variables)).

Vite can generate separate production maps with `build.sourcemap: "hidden"`, which omits bundle map comments but still writes the map files ([Vite build options](https://vite.dev/config/build-options#build-sourcemap)). Therefore:

- build once with hidden maps;
- archive the maps privately as a CI artifact with an explicit short retention window and the same `buildId`;
- delete `*.map` from the directory uploaded to Pages;
- include the build ID and hashed bundle filename/line/column in the user-exportable report, but symbolize stacks only during maintainer investigation.

Hidden does **not** mean private if the files are deployed. Do not expose repository source through Pages merely for easier debugging.

## CSP on GitHub Pages

GitHub Pages supports HTTPS ([GitHub Pages HTTPS documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)), but GitHub's accepted staff answer states that Pages repositories cannot currently configure custom response headers ([GitHub Pages custom-header answer](https://github.com/orgs/community/discussions/54257#discussioncomment-5767346)). A CSP can still be enforced from an early `<meta http-equiv="Content-Security-Policy">` element.

Start against the production build with approximately:

```text
default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';
font-src 'self'; img-src 'self' data:; connect-src 'self';
manifest-src 'self'; worker-src 'self'; object-src 'none';
base-uri 'none'; form-action 'self'
```

The temporary `style-src 'unsafe-inline'` is needed by current React style attributes; remove static inline styles incrementally and keep only the dynamic progress/tooltip styles until a safer CSS-variable approach is tested. No script `unsafe-inline` or `unsafe-eval` is needed in the production bundle.

CSP Level 3 specifies that meta policies do not apply to content before the element and cannot provide report-only mode, `report-uri`, `frame-ancestors`, or `sandbox`; `frame-ancestors` is ignored in meta policies ([W3C CSP3 meta policy](https://www.w3.org/TR/CSP/#meta-element)). Consequently, verify enforcement in Playwright and browser consoles, but do not claim clickjacking protection or CSP violation collection while remaining on unproxied GitHub Pages. Full response-header protection/reporting requires a header-capable host or proxy and should be a separate hosting decision.

## Offline/PWA observability

When the PWA slice is built, extend the same diagnostic contract with a few stable events: registration success/failure, update discovered, worker installed/activated, controller changed, cache cleanup/failure, and navigation served from cache/network/fallback. `updatefound` signals a new installing worker and `controllerchange` signals a newly active controller ([Service worker `updatefound`](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updatefound_event), [`controllerchange`](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/controllerchange_event)). A controlled page can receive typed operational messages from its worker through the service-worker `message` event ([Service worker messages](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/message_event)). Validate every message because that boundary is external to the React type system.

Use `navigator.onLine` only as a user hint. Browser/OS heuristics can report an attached LAN as online without Internet reachability, so it must not disable saving, loading, or play ([MDN `Navigator.onLine`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)). The actual fetch/cache result is the useful signal. Keep offline diagnostics local and exportable; an observability design that only works when the network works is an unusually literal joke, but not a useful one.

## Acceptance tests for the first slice

1. A deliberately throwing child shows the accessible recovery UI, preserves roster storage, and can retry/reload.
2. React caught, uncaught, and recoverable paths plus browser error/rejection paths create one sanitized event each without duplicate records.
3. More than 100 events retains only the newest 100; malformed/huge detail values are bounded; CR/LF, names, URLs, paths, and save-shaped content are absent from export.
4. Diagnostics download works without clipboard permission and contains the deployed build ID.
5. The production artifact enforces the tested meta CSP and contains no source-map files; CI retains maps with explicit expiration.
6. The later PWA suite covers registration failure, offline shell start, update discovery/activation, stale-cache recovery, and worker-message validation without relying on `navigator.onLine` as truth.

## Priority order

1. **P0:** typed bounded recorder + redaction/export tests.
2. **P0:** root Error Boundary + accessible recovery UI + React/browser capture wiring.
3. **P0:** build ID and private short-lived source-map artifact.
4. **P1:** production-tested meta CSP, with its GitHub Pages limitations documented.
5. **P1:** service-worker lifecycle/cache events when the existing PWA backlog is implemented.
6. **Defer:** persistent logs, remote telemetry, replay, third-party crash SDKs, and alternate hosting until concrete operating needs justify their privacy and maintenance cost.
