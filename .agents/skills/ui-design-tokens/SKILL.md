---
name: ui-design-tokens
description: Management of OKLCH color space design tokens, theme switching (Remarque & OKLCH Terminal Themes), and typographic standards.
---

# UI Design Tokens Skill

When modifying styles, colors, or themes:

1. **OKLCH Color Space**: Always use `oklch(L C H)` for custom color variables. OKLCH guarantees perceptual lightness uniform across all hues.
2. **Token Centralization**: Define all colors, borders, and gradients in `src/index.css` as custom CSS properties. Component files must reference CSS variables (`var(--accent-primary)`) rather than hardcoding hex/RGB values.
3. **Theme Alignment**:
   - Modern Dark Theme (`:root`): Dark slate background (`oklch(0.18 0.03 250)`), bright accents.
   - Retro ProgrOS Theme (`[data-theme='progros']`): Nostalgic Windows Classic / Terminal Teal palette (`oklch(0.55 0.12 185)`).
4. **Remarque Typography Scale**: Body text minimum 17px, monospace log feed with `'JetBrains Mono'`, sans-serif UI headers with `'Inter'`.
