# Browser persistence and clipboard contract

**Research date:** 2026-08-02  
**Scope:** issue #28, `src/state/saveManager.ts`, and `src/components/SaveModal.tsx`  
**Evidence policy:** browser standards, React documentation, MDN platform documentation, and W3C accessibility guidance

## Recommendation

Keep the existing dependency-free `localStorage` design, but make every browser boundary return a truthful typed result. Do not introduce IndexedDB, a persistence framework, a retry queue, or permission probing for this issue.

The minimum safe contract is:

1. Acquire `window.localStorage` inside `try`; distinguish an absent roster from an unavailable, unreadable, or corrupt roster.
2. Never turn a failed/corrupt read into an empty roster and write it back. Preserve the original bytes, keep the active in-memory game unchanged, and offer recovery guidance.
3. Persist only in the event handler for an explicit save/import/delete action. Opening the modal may read once, but ticking game state must not cause writes.
4. Invoke `navigator.clipboard.writeText()` directly from the copy button, `await` it, and announce success only after fulfillment. On absence or rejection, keep a selectable save string available for manual copying.
5. Put success in a polite atomic status region and failures in an alert region. Keep focus on the initiating control; do not use `window.alert()`.

## What is broken now

`saveManager.ts` evaluates `window.localStorage` before its `try` blocks. Accessing the getter can itself throw `SecurityError` when browser policy blocks persistence, so those checks are not safe capability tests. `loadRoster()` then maps getter/read errors, malformed JSON, a non-object root, and invalid character entries to the same empty object. A later save or delete can consequently replace recoverable corrupt data with a new roster.

`SaveModal.tsx` saves inside an Effect depending on both `isOpen` and the complete `character`. The character changes on game ticks, so an open modal repeatedly performs synchronous parse, schema validation, serialization, and storage writes. Its copy handler neither awaits nor catches `writeText()` and reports success immediately through `alert()`.

## Storage boundary

### Failure model

The `localStorage` getter may throw `SecurityError`, including when browser policy denies persistence ([MDN `Window.localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage#exceptions)). `setItem()` may throw `QuotaExceededError` when a value cannot be stored; the HTML algorithm checks this before setting the key, so one failed `setItem` does not partially replace that key ([HTML Standard, Web Storage API](https://html.spec.whatwg.org/multipage/webstorage.html#dom-storage-setitem-dev)). Reads, parsing, validation, serialization, and getter access can still fail separately and all belong inside the boundary.

Return a discriminated result from roster reads, not a bare roster:

```text
success: { ok: true, value: roster }
failure: { ok: false, error: { code, message } }

codes: storage_unavailable | storage_corrupt | storage_full | storage_failed
```

`storage_corrupt` covers malformed JSON, the wrong root shape, or any invalid roster member. Validate the whole stored roster before exposing it as writable state; silently dropping invalid members makes the next write destructive. Do not include raw stored data, character names, or PQW strings in diagnostics.

### Corruption preservation

On any read/parse/schema failure:

- leave the storage key byte-for-byte unchanged;
- return failure rather than an empty roster;
- do not perform the requested save/delete or mutate the active Zustand session;
- tell the user that existing browser data was not overwritten;
- optionally expose an explicit Blob download of the raw roster as a later recovery feature, but do not automatically duplicate it into another storage key (that can also fail quota and creates another sensitive copy).

Only `getItem() === null` means “no roster yet.” An empty but valid object means “empty roster.” Everything else is an error state.

### Atomicity and concurrency limit

One final serialized roster written with one `setItem()` is sufficient for the current single-tab product: the platform either sets that key or throws first. It is not a transaction across the preceding read and validation. The HTML Standard warns authors to assume there is no locking between agent clusters; two windows can read the same value and then overwrite each other’s changes ([HTML Standard, Web Storage concurrency warning](https://html.spec.whatwg.org/multipage/webstorage.html#the-storage-interface)). Therefore:

- describe current behavior as **single-key replacement with last-writer-wins across tabs**, not atomic persistence;
- never “fix” this with a second pre-write read, which still races;
- track true multi-tab coordination separately if it becomes a product requirement; IndexedDB transactions or a carefully designed Web Locks protocol would be an architectural change.

Web Storage operations are synchronous and block JavaScript while they run, so removing tick-driven writes is both correctness and responsiveness work ([MDN Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API#concepts_and_usage)). No debounce is needed: it would merely delay the same unintended persistence and complicate failure feedback.

## React interaction boundary

React’s guidance is to keep logic caused by a particular user interaction in that event handler; Effects re-synchronize whenever dependencies change ([React, “You Might Not Need an Effect”](https://react.dev/learn/you-might-not-need-an-effect#sharing-logic-between-event-handlers)). Accordingly:

- load the roster once when the dialog is opened, without coupling it to `character` ticks;
- make “Save current character” an explicit button, or perform exactly one save in the parent’s open-dialog event handler if that existing behavior must remain;
- keep import and confirmed delete in their existing event handlers;
- refresh the displayed roster only after a successful mutation;
- leave the dialog open with actionable feedback after failure.

Do not suppress dependencies, use a ref as an Effect guard, or debounce the current Effect. Those approaches preserve a hidden write trigger and behave poorly under remounts. React Strict Mode intentionally re-runs Effects in development to expose missing cleanup and impure synchronization ([React `StrictMode`](https://react.dev/reference/react/StrictMode#fixing-bugs-found-by-double-rendering-in-development)).

## Clipboard boundary

`Clipboard.writeText()` is available only in secure contexts, returns a promise that fulfills after the system clipboard is updated, and can reject with `NotAllowedError` ([MDN `Clipboard.writeText`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)). The Clipboard specification also gives user agents control over permission behavior, considers transient activation, and requires a focused document for asynchronous clipboard access ([W3C Clipboard API, permissions](https://www.w3.org/TR/clipboard-apis/#clipboard-write-permission), [privacy requirement](https://www.w3.org/TR/clipboard-apis/#privacy-async-clipboard)).

Use one async button handler:

```text
if clipboard/writeText is absent -> clipboard_unavailable
else await writeText(saveString)
fulfilled -> clipboard_copied
NotAllowedError -> clipboard_denied
other rejection -> clipboard_failed
```

The actual call is the capability test. Do not preflight with the Permissions API: browser policy remains implementation-controlled and a permission query cannot prove that the subsequent focused, activated write will succeed. Keep the call in the original click stack, do not retry automatically, and never log/export the clipboard payload.

For every failure, reveal or retain a read-only/selectable text control containing the exact PQW value and explain “Select and copy the save string manually.” Do not use deprecated `document.execCommand('copy')` as a fallback. A `.pqw` Blob download is another valid explicit fallback if already supported elsewhere.

## Accessible feedback

Replace `alert()` and unannotated text with persistent containers already present when the dialog renders:

- successful save/copy/delete: `role="status"`, `aria-live="polite"`, `aria-atomic="true"`;
- failed save/copy/import/delete: `role="alert"` (do not also make the same message a status);
- message text names the operation and truthful outcome, for example, “Save copied to clipboard” or “Clipboard access was denied. Select the save string and copy it manually.”

WCAG 2.2 requires status messages to be programmatically determinable without moving focus, and WAI recommends `role=status` for results and `role=alert` for errors that do not change context ([WAI, Understanding SC 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages)). Preserve focus on the button or failed field, avoid assertive success announcements, clear stale opposite-state feedback when a new action begins, and disable the copy button while its promise is pending to prevent duplicate announcements.

## Prioritized acceptance contract

1. **P0 — loss prevention:** getter, `getItem`, parse, schema, stringify, and `setItem` failures are typed; corrupt/unreadable bytes remain unchanged; active game state remains unchanged.
2. **P0 — truthful clipboard:** missing API and rejected promises show manual-copy fallback; success appears only after promise fulfillment; PQW content never enters diagnostics.
3. **P0 — stop the write storm:** an open modal receives many character ticks without another `setItem`; persistence happens only at one named user action.
4. **P1 — accessible state:** success uses a polite atomic status, failure uses an alert, focus remains stable, and repeated actions yield updated feedback.
5. **P1 — documented concurrency:** tests and copy do not imply cross-tab transactions; last-writer-wins remains an explicit limitation until multi-tab coordination is required.

### Required tests

- mock the `localStorage` getter throwing `SecurityError`, `getItem()` throwing, corrupt JSON, invalid roster members, `JSON.stringify()` failure where practical, and `setItem()` throwing `QuotaExceededError`;
- for every failed mutation, assert the pre-existing raw value and active game session are unchanged;
- spy on `setItem`, open the modal, advance multiple game ticks, and assert no tick-triggered writes;
- mock `navigator.clipboard` as absent, fulfilled, rejected with `NotAllowedError`, and rejected generically; assert visible text and `status`/`alert` roles;
- verify the fallback save string is keyboard reachable and selectable, and that no raw save or character content is recorded in diagnostics.

