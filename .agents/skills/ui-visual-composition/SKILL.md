---
name: ui-visual-composition
description: Guidelines for high-hierarchy, density-optimized, and non-generic web UI layout and visual composition.
---

# UI Visual Composition Skill

When creating or modifying frontend interfaces:

1. **Hierarchy First**: Establish immediate visual focal points. Use font weight and size contrasts instead of aggressive color changes.
2. **Card & Component Spacing**: Enforce consistent padding scale (8px, 12px, 16px, 24px). Avoid ad-hoc inline offsets.
3. **Density Management**: Progress Quest is a stat-dense dashboard interface. Keep table cells, progress bars, and inventory items tightly aligned with high legibility.
4. **Elevation & Glassmorphism**: Use subtle 1px border highlights (`var(--panel-border)`) and soft drop-shadows (`box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1)`) for depth without visual clutter.
5. **No AI Slop**: Avoid generic unstyled default browser components, plain solid blue/red colors, or unrounded sharp borders unless intentionally in retro mode.
