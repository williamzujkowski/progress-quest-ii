---
name: ui-responsive-layout
description: Responsive layout strategies for multi-surface desktop and mobile viewports.
---

# UI Responsive Layout Skill

When designing mobile and responsive layouts:

1. **Fluid Grid Containers**: Use CSS Grid with dynamic column auto-fit or explicit breakpoint shifts (e.g. 3-column on desktop `>1024px`, 2-column on tablet `640px-1024px`, single column on mobile `<640px`).
2. **Touch Targets**: On touch viewports, interactive elements (buttons, inputs) must be at least **44x44px** to prevent accidental mis-taps.
3. **Overflow Protection**: Scrollable lists (activity log, inventory feed) must specify max heights (`max-height: 280px`) with `overflow-y: auto` to prevent pushing page containers past viewport boundaries.
4. **Viewport Meta**: Ensure `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` is configured in `index.html`.
