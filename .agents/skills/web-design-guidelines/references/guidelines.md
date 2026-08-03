# Pinned Web Interface Guidelines

Source: Vercel Labs, `web-interface-guidelines`, commit
`d0a657bfe87e86dd3a4753d7ec28c7e7dd7a88fe`. Adapted under the MIT license.

## Accessibility

- Give icon-only buttons accessible names and form controls labels.
- Use native buttons for actions and links for navigation.
- Support keyboard interaction; prefer semantic HTML before ARIA.
- Give images useful `alt` text or empty `alt` when decorative.
- Hide decorative icons from assistive technology.
- Announce asynchronous status and validation updates with the appropriate live region.
- Keep heading levels hierarchical and provide a skip link to main content.
- Give anchored headings `scroll-margin-top` when sticky UI can obscure them.

## Focus

- Provide a visible `:focus-visible` treatment for every interactive element.
- Never remove an outline without an equivalent replacement.
- Use `:focus-within` for compound controls when the group needs a focus treatment.

## Forms

- Give fields meaningful names, labels, types, input modes, and autocomplete behavior.
- Never block paste.
- Make labels and checkbox/radio controls a single hit target.
- Leave submit enabled until a request starts and expose pending state.
- Put errors beside their fields and focus the first invalid field after submission.
- Make placeholders examples, use an ellipsis (`…`), and avoid password-manager traps.
- Warn before abandoning genuinely unsaved work.

## Motion

- Honor `prefers-reduced-motion`.
- Animate compositor-friendly `transform` and `opacity`; never `transition: all`.
- Set deliberate transform origins and keep motion interruptible.
- Animate an SVG wrapper or group instead of the SVG root when possible.

## Typography & content

- Use typographic ellipses and curly quotation marks in user-facing prose.
- Use non-breaking spaces for inseparable values such as `10 MB`.
- Use tabular numerals for changing or compared numeric readouts.
- Balance or pretty-wrap headings where it prevents widows.
- Ensure text containers handle empty, short, average, and pathological content.
- Give flex/grid text children `min-width: 0` when truncation or wrapping depends on it.

## Images & performance

- Set image width and height to prevent layout shift.
- Lazy-load below-fold images and prioritize critical above-fold images.
- Virtualize or use `content-visibility` for lists that can exceed roughly 50 items.
- Do not perform layout reads during render; batch DOM reads and writes.
- Keep controlled inputs cheap per keystroke.
- Preconnect to external asset origins and preload critical fonts when applicable.

## Navigation & state

- Use real links for navigation so standard browser gestures work.
- Reflect shareable navigation state in the URL when it materially benefits users.
- Confirm or provide undo for destructive actions.

## Touch & interaction

- Use `touch-action: manipulation` for controls when appropriate.
- Set tap highlight behavior intentionally.
- Contain overscroll in dialogs, drawers, and sheets.
- Avoid mobile autofocus unless there is one unmistakable primary field.

## Safe areas & layout

- Account for safe-area insets in full-bleed installed/mobile layouts.
- Fix the content causing horizontal overflow instead of masking it globally.
- Prefer CSS Grid and Flexbox over JavaScript layout measurement.

## Dark mode & theming

- Set `color-scheme` to match the active theme.
- Keep `<meta name="theme-color">` synchronized with the page background.
- Set explicit foreground and background colors on native selects.

## Locale & hydration

- Format dates and numbers with `Intl` rather than hardcoded locale formats.
- Detect language from browser preferences, not location.
- Mark brand names, code tokens, and identifiers `translate="no"` when translation would corrupt them.
- Pair controlled values with change handlers and avoid hydration-only suppression.

## Hover, copy, and errors

- Give controls visible hover, active, and focus feedback with increasing prominence.
- Prefer active voice, specific labels, second-person copy, and numerals for counts.
- Give errors a recovery step, not merely a diagnosis.

## Flag immediately

- Disabled zoom (`user-scalable=no` or `maximum-scale=1`).
- Paste prevention.
- `transition: all`.
- Removed outlines without a focus-visible replacement.
- Clickable non-interactive elements.
- Unlabelled controls, unnamed icon buttons, or images without dimensions.
- Unbounded large list rendering.
- Hardcoded locale-sensitive dates/numbers.
- Unjustified autofocus.
