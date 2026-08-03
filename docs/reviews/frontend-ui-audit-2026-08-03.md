# Frontend UI hardening audit

Date: 2026-08-03  
Scope: Progress Quest II live-style React/Vite dashboard, desktop and mobile  
Tracking: #125, #25

## Playbooks applied

- Local `frontend-design`, `ui-visual-composition`, `ui-responsive-layout`, `ui-design-tokens`, and `ui-accessibility-audit` skills.
- Pinned `web-design-guidelines` source checklist.
- Vercel `vercel-react-best-practices`, limited to relevant Vite/client rules.
- Repository Playwright and Axe suites for runtime evidence.

Microsoft Playwright CLI was not selected for this repository pass: browser access was already available through the installed `@playwright/test` stack, and the request made additional MCP setup conditional on browser access being absent. Anthropic `webapp-testing` was also rejected because its Python helper would duplicate the stronger JavaScript Playwright, Axe, and PWA suites already maintained here.

## Source findings and disposition

| Area | Finding | Disposition |
| --- | --- | --- |
| Theming | The package port was already current at `oklch-terminal-themes` 0.7.0, but only Remarque palettes were exposed and browser chrome stayed on a hardcoded color. | Added 2 statically imported, contrast-gated palettes; mapped upstream signature accents; synchronized theme metadata; retained ProgrOS. |
| Desktop layout | A later stylesheet reset `.quest-column` from Grid to Flex, leaving dead space below a sparse Activity Log. | Corrected the cascade and added sparse plus dense one-screen browser contracts. |
| Dialog accessibility | Div-based dialogs did not provide native modality, initial/return focus, Escape behavior, background inertness, or radio-group semantics. | Moved to native modal dialogs, added fieldset/legend groups and 44 px compact targets, and covered both dialogs by keyboard. |
| Responsive interaction | Modal scroll chaining and installed-mobile safe areas were not explicit. | Contained overscroll on the scrolling surface, used safe-area token padding, and retained 320/375/768 px overflow coverage. |
| Forms and copy | The save import field used brittle placeholder copy and fields lacked durable names/autocomplete intent. | Added names/autocomplete behavior, a typographic ellipsis, and label-based E2E locators. |
| Test artifacts | Playwright requested traces only on retry while retries were disabled. | Changed both browser configs to retain traces on the first failure. |
| React performance | Whole-store/character subscriptions may render stable surfaces on the 50 ms game clock, but no profile proves material cost. | No speculative memoization added; measurement-first work is tracked in #127. |
| Skill supply chain | The upstream web checklist fetched mutable instructions, and a React rule could invoke an uninstalled package through `npx`. | Pinned the checklist, retained attribution, removed the compiled duplicate, and required `npx --no-install` for an already-installed optimizer. |

## Runtime review

- Visually inspected Remarque Light at 1440×900 and 375×812, Green Phosphor CRT at 1440×900, and Ocean Sunset HC at 375×812.
- Verified the desktop dashboard fills one viewport with sparse and dense feeds; Activity Log follows the latest event; inventory and loadout remain bounded.
- Verified horizontal fit at 320, 375, and 768 px, including long inventory and tooltip content.
- Ran Axe WCAG A/AA checks for all 5 themes with a visible tooltip.
- Verified forced-colors usability, reduced motion, tooltip hover/focus/touch behavior, dialog focus cycles, storage denial, clipboard denial, error recovery, and malformed imports.
- Verified the production PWA install contract, offline reload, update approval, rollback, stalled activation, and cache privacy.

## Deferred work

- #126 — apply the persisted palette before first paint without weakening CSP.
- #127 — profile game-loop React renders before optimizing subscriptions.
- #128 — refresh the local frontend-design provenance and WCAG 2.2 audit guidance.
- #26 — expand clean-checkout browser coverage to representative WebKit/mobile projects.
