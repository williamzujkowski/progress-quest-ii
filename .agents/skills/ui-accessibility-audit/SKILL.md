---
name: ui-accessibility-audit
description: Auditing UI against WCAG 2.2 AA — contrast, keyboard operation, ARIA, and the manual checks automation cannot make.
---

# UI Accessibility Audit

WCAG 2.2 is the current W3C Recommendation and supersedes 2.1 for new work. It is backwards
compatible: meeting 2.2 means meeting 2.1.

**Automated checks are a floor, never a conformance claim.** W3C is explicit that conformance
requires automated testing *and* human evaluation. Two failure modes in this repository make that
concrete rather than theoretical:

- axe reports a subtree as `incomplete` — not a violation — when it cannot determine a background.
  A suite asserting only on `violations` reads that as a pass. `e2e/contrast.spec.ts` exists
  because a failing contrast shipped through exactly that gap.
- A surface that never renders on the page under test is never measured at all, and silence is
  indistinguishable from success. Seed the state a surface needs rather than assuming coverage.

## Automated floor

1. **Contrast** — body text ≥ 4.5:1, large text and meaningful icons ≥ 3:1, UI component and
   graphical boundaries ≥ 3:1 (1.4.3, 1.4.11). Measure the composited backdrop: tokens here are
   translucent, so an element's own background is rarely the whole answer. Settle the paint before
   sampling; a mid-transition reading is arithmetically correct for a frame nobody sees.
2. **Keyboard** — every interactive element reachable and operable by `Tab` and `Enter`/`Space`
   (2.1.1). Never suppress a focus ring without an equally visible replacement (2.4.7). A
   scrollable region with no focusable content needs `tabindex="0"`, or it cannot be scrolled by
   keyboard at all in some browsers.
3. **Names and roles** — icon-only controls carry an accessible name. Progress bars carry
   `role="progressbar"` with `aria-valuenow` / `aria-valuemin` / `aria-valuemax`, and
   `aria-valuetext` where the number alone would not be understood (4.1.2).
4. **Prefer native semantics.** `<details>`, `<button>`, and a real list get keyboard operation and
   announcement for free. Reach for ARIA only when no element does the job — and note that adding
   a `role` to an element that already has a useful implicit one *replaces* it.

## New in WCAG 2.2 — check these deliberately

- **2.4.11 Focus Not Obscured (AA)** — a focused element must not be hidden by sticky headers,
  tooltips, or overlays. Stacking contexts have to be ordered deliberately; independently chosen
  `z-index` values are how this breaks.
- **2.5.8 Target Size (Minimum, AA)** — pointer targets at least 24×24 CSS px, or spaced so a
  24 px circle centred on each touches no other target. Check the smallest icon buttons and any
  inline control inside dense text.
- **2.5.7 Dragging Movements (AA)** — any drag interaction needs a single-pointer alternative.
- **3.2.6 Consistent Help (A)** and **3.3.7 Redundant Entry (A)** — apply where help or re-entered
  data exists. Say so when they do not apply rather than leaving them unmentioned.

## Manual checks automation cannot make

Work through these on a representative screen and record the result:

1. **Hover/focus content (1.4.13)** — tooltips must be dismissible without moving focus, hoverable
   without vanishing, and persistent until dismissed or focus/hover leaves.
2. **Reflow (1.4.10)** — no horizontal scrolling at 320 CSS px width, equivalent to 400% zoom at
   1280 px. Wide content scrolls inside its own container; the page body never does.
3. **Text spacing (1.4.12)** — no loss of content when line height is set to 1.5×, paragraph
   spacing to 2×, letter spacing to 0.12×, and word spacing to 0.16× the font size.
4. **Zoom to 200% (1.4.4)** — text scales without clipping or overlap.
5. **Forced colors / high contrast** — nothing conveyed by colour alone survives being repainted;
   borders and focus rings remain visible.
6. **Reading order** — the DOM order matches the visual order, so a screen reader and a sighted
   reader receive the same sequence. Visual reordering in CSS is where this diverges.
7. **Reduced motion** — `prefers-reduced-motion` genuinely suppresses animation rather than
   shortening it.

## Recording the result

State which criteria were checked, how, and what the outcome was. "axe reported no violations" is
one line of evidence about one part of the floor, not an audit. Where a criterion does not apply,
say that it does not apply and why — an unmentioned criterion is indistinguishable from a
forgotten one.

Reference: [WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/).
