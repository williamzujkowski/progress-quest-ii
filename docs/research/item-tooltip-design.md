# Item tooltip design research

## Findings

- The [W3C APG tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) defines a tooltip as a non-interactive popup invoked by pointer hover or keyboard focus. The trigger keeps focus, references the popup with `aria-describedby`, and the popup uses `role="tooltip"`.
- The [ARIA tooltip role guidance](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/tooltip_role) recommends treating important information as visible content rather than hiding it exclusively in a tooltip. ProgQuest therefore keeps item names, quantities, and spell levels visible in the lists and uses tooltips for supplemental flavor and mechanics.
- The [HTML `title` guidance](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/title) supports a native browser fallback. The implementation keeps a concise `title` on each trigger in addition to the styled tooltip.

## Product decision

Tooltips use a compact three-part format: item name, one sardonic in-world sentence, and a mechanics line. Equipment reports slot-derived attack/defense rating from the existing tables. Spells report level and the simulation's abstract priority model. Inventory reports quantity and encumbrance, explicitly stating that loot has no direct combat effect.

The engine currently does not expose numeric spell damage or per-loot combat effects, so the UI does not invent them. If those mechanics become explicit later, `src/data/itemDetails.ts` is the seam for replacing the explanatory text with authoritative values.
