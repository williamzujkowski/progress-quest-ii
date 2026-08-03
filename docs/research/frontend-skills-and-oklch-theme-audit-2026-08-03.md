# Frontend skills and OKLCH theme audit

Date: 2026-08-03

## Recommendation

Use a deliberately small review stack:

1. **Sync the existing `frontend-design` skill from Anthropic's current upstream**, then keep the Progress Quest II-specific subject guidance as a clearly marked local overlay. The local copy is a shortened derivative and omits useful upstream guidance on real UI copy, two-pass design planning, screenshot critique, reduced motion, and self-editing. The upstream skill is active, vendor-authored, and Apache-2.0 licensed at the skill level ([skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md), [2026-06-09 update](https://github.com/anthropics/skills/commit/2235be7c60b551f5de82ade908fd3816455afcda), [license](https://github.com/anthropics/skills/blob/main/skills/frontend-design/LICENSE.txt)). Preserve its license and mark the local modifications as required by Apache-2.0.
2. **Add a pinned, locally reviewed version of Vercel's Web Interface Guidelines as an audit skill.** It adds a much broader source checklist than the current three-point accessibility and responsive skills: semantic HTML, focus, forms, motion, content overflow, typography, theme metadata, safe areas, localization, and interaction details ([skill wrapper](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md), [rules at audited commit](https://github.com/vercel-labs/web-interface-guidelines/blob/d0a657bfe87e86dd3a4753d7ec28c7e7dd7a88fe/command.md)). Do **not** retain the wrapper's instruction to fetch mutable remote instructions on every run; vendor or checksum a reviewed revision. Treat its rules as heuristics where they conflict with project intent or W3C guidance (for example, URL-syncing every state value is not universally desirable).
3. **Install Microsoft's official Playwright CLI skill at host level and keep permanent assertions in this repository's Playwright suite.** It uniquely adds low-context interactive browser inspection, mobile emulation, console/network capture, traces, screenshots, and user annotation. Microsoft explicitly recommends CLI + skills for coding agents and documents `playwright-cli install --skills`; MCP remains useful when structured accessibility-tree interaction is preferred ([Playwright overview](https://github.com/microsoft/playwright#playwright-cli), [skill](https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/SKILL.md), [Apache-2.0 license](https://github.com/microsoft/playwright-cli/blob/main/LICENSE)). The repo already has `@playwright/test`, `@axe-core/playwright`, 320 px overflow tests, keyboard tests, and PWA tests; interactive discoveries should become stable `e2e/` assertions rather than ephemeral agent evidence.
4. **Use Vercel's React best-practices skill only for a focused client-performance pass.** Its prioritized React rules add value for rerender, storage, event-listener, and bundle review, but much of the corpus targets Next.js/server rendering and is irrelevant to this Vite SPA ([skill](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices), [2026-04-14 skill update](https://github.com/vercel-labs/agent-skills/commit/805687f34e8c10b420e3d11335a0ca2c3c90d992)). Apply only measured, React/Vite-relevant findings; React's own guidance says profiling should measure render cost before optimization ([React Profiler](https://react.dev/reference/react/Profiler)).
5. **Upgrade the local accessibility skill to WCAG 2.2 instead of adding another generic bundle.** W3C advises using WCAG 2.2 for current work and explicitly says conformance needs automated testing *and* human evaluation ([WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/)). Add manual checks for focus not obscured, drag alternatives if applicable, target size, hover/focus tooltip dismissal and persistence, 400%/320 CSS px reflow, text spacing, forced colors, zoom, and screen-reader reading order. Axe remains a useful automated floor, not a conformance certificate ([Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)).

This is additive without being bloated: Anthropic owns creative direction, Vercel owns a deterministic source audit, Microsoft owns browser execution, and W3C owns accessibility requirements.

## Candidate assessment

Repository activity and popularity are snapshots from the GitHub API on 2026-08-03; stars are a discovery signal, not proof of correctness.

| Candidate | Trust / activity / license | Increment beyond current skills | Verdict |
| --- | --- | --- | --- |
| [Anthropic `frontend-design`](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | First-party; repo pushed 2026-07-24; ~166k stars; skill-specific Apache-2.0 | Stronger design process, copy discipline, critique, and distinctiveness than the abbreviated local copy | **Sync now** |
| [Vercel `web-design-guidelines`](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | First-party; collection pushed 2026-07-24; ~29.7k stars; README declares MIT and the underlying rules repo is MIT | 100+ inspectable rules; large coverage gain over local checklist skills | **Adopt pinned** |
| [Microsoft `playwright-cli`](https://github.com/microsoft/playwright-cli) | First-party; pushed 2026-07-15; ~12.3k stars; Apache-2.0 | Interactive runtime evidence, traces, console/network inspection, annotation | **Install host-level** |
| [Vercel `react-best-practices`](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) | First-party; active collection; same README license declaration | Deep performance corpus, but substantial Next.js/server-only material | **Use selectively** |
| [Addy Osmani `frontend-ui-engineering`](https://github.com/addyosmani/agent-skills/tree/main/skills/frontend-ui-engineering) | Named maintainer; pushed 2026-07-26; ~81.4k stars; MIT | Good end-to-end verification checklist, but heavily duplicates AGENTS, Ponytail, TDD, frontend, responsive, and accessibility skills | **Reference; do not install** |
| [Interface Design](https://github.com/Dammyjay93/interface-design) | Community project; pushed 2026-06-20; ~5.4k stars; MIT | Persistent visual-system discipline and design-review commands overlap local tokens/composition skills | **Borrow critique ideas only** |
| [TestDino Playwright Skill](https://github.com/testdino-hq/playwright-skill) | Vendor community project; pushed 2026-07-02; ~342 stars; MIT | Broad Playwright reference set, but the Microsoft skill and local tests cover the core need with stronger provenance | **Do not add now** |
| [wshobson/agents UI skills](https://github.com/wshobson/agents/blob/main/docs/agent-skills.md) | Community marketplace; pushed 2026-07-22; ~38.5k stars; MIT | Wide WCAG/design inventory, but redundant and harder to audit as a whole | **Do not bulk-install** |

## What Hacker News adds

Hacker News is useful here as practitioner feedback, not as the source of technical requirements.

- The [Interface Design discussion](https://news.ycombinator.com/item?id=46699260) argues that principle-based design direction produces less generic work than long prescriptive style recipes, while also exposing a recurring warm-cream aesthetic failure. That supports syncing Anthropic's principle-based skill while retaining this game's explicit retro-terminal subject and tokens.
- The [Playwright skill discussion](https://news.ycombinator.com/item?id=45642911) raises the correct adoption test: prove a skill improves results over what the model and repo already know. It also recommends converting useful exploratory scripts into permanent E2E tests. This repository already follows that stronger pattern.
- HN's [OKLCH discussion](https://news.ycombinator.com/item?id=42210553) values perceptual lightness and programmable variants, but also cautions that gamut and contrast still need validation. Therefore palette membership must never be treated as an accessibility guarantee.

## OKLCH Terminal Themes: current state

The requested port is already substantially complete and uses the current npm release:

- `package.json` depends on `@williamzujkowski/oklch-terminal-themes@^0.7.0`; `0.7.0` is also the current npm `latest` and [GitHub release](https://github.com/williamzujkowski/oklch-terminal-themes/releases/tag/v0.7.0).
- `src/theme.ts` statically imports `remarque-dark` and `remarque-light`, maps all 20 upstream slots to `--terminal-*`, validates persisted IDs, and retains ProgrOS as a local theme.
- `src/index.css` is already a semantic adapter: application tokens consume terminal variables rather than hardcoded component colors.
- `src/__tests__/theme.test.ts` gates body, ANSI, cursor, and selection contrast from upstream metadata.
- The source project is active, MIT licensed, and supplies typed per-theme JSON, a slim client dataset, a lazy-load index, a CSS-variable helper, static CSS, contrast metadata, CVD scores, counterpart links, and a computed accent ([README/integration contract](https://github.com/williamzujkowski/oklch-terminal-themes#usage), [schema](https://github.com/williamzujkowski/oklch-terminal-themes#schema), [license](https://github.com/williamzujkowski/oklch-terminal-themes/blob/main/LICENSE)).

Do not import the full picker corpus into the PWA. In the installed `0.7.0` package, uncompressed data is approximately 6.0 MB for `themes.json`, 1.08 MB for `themes-slim.json`, 251 KB for `index.json`, and 9 KB for one Remarque record. A curated, statically imported allowlist keeps the app small, deterministic, and offline.

## Recommended theme hardening slice

1. Keep Remarque Dark, Remarque Light, and ProgrOS; add only a small curated set whose upstream metadata clears body text, selection, cursor, and ANSI thresholds. Prefer a dark/light counterpart and `cvd-safe` where available.
2. Map the upstream computed `accent` to the semantic primary-accent token. Mapping every theme's primary action to ANSI blue discards the package's theme-specific signature color.
3. Update `<meta name="theme-color">` when the theme changes. It is currently fixed to `#171512`, so light and non-Remarque themes can disagree with browser/PWA chrome.
4. Apply the stored/system theme before first paint or provide equivalent inline boot CSS to prevent a light/dark flash. Keep storage reads fail-closed as they do now.
5. Set `color-scheme` from each selected theme's polarity, not only the two hardcoded selectors, if the curated list expands.
6. Add Playwright assertions for every curated theme at desktop, 320 px, reduced motion, forced colors/high contrast where supported, and offline reload. Use `toHaveScreenshot()` only for stable layout regions; Playwright documents its built-in visual comparison support ([visual comparisons](https://playwright.dev/docs/test-snapshots)).
7. Test tooltip content against WCAG 2.2's hover/focus behavior: hoverable, dismissible without moving focus, and persistent until focus/hover is removed or the user dismisses it ([WCAG 2.2, 1.4.13](https://www.w3.org/TR/WCAG22/#content-on-hover-or-focus)).

## Review order for the next UI pass

1. Anthropic design critique: hierarchy, subject specificity, real copy, restraint.
2. Vercel pinned source scan: React, CSS, `index.html`, and all interactive components.
3. WCAG 2.2 manual + axe pass: keyboard, zoom/reflow, forced colors, reduced motion, tooltip behavior, modals, status messages.
4. Microsoft Playwright runtime pass: Chromium, Firefox, WebKit; 320/375/768/1024/1440 widths; short and pathological inventory/log/item strings; offline PWA reload; console/network errors.
5. React measured performance pass: long-running game loop with large inventory/log state, using profiler evidence before changing memoization.
6. Convert every confirmed regression into a focused Playwright/Vitest assertion and track deferred work in GitHub issues.
