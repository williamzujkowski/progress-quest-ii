---
name: ui-accessibility-audit
description: Enforcing WCAG 2.1 AA/AAA contrast ratios, keyboard accessibility, and ARIA attributes across UI components.
---

# UI Accessibility Audit Skill

When building or updating interactive components:

1. **Contrast Standards**:
   - Body text against background must exceed **4.5:1** contrast ratio (WCAG AA).
   - Large headers and icons must exceed **3.0:1** contrast ratio.
2. **Keyboard Navigation & Focus**:
   - Interactive elements (`button`, `a`, `input`, `select`, `textarea`) must be reachable via `Tab`.
   - Never suppress focus rings without providing a visible custom outline (`outline: 2px solid var(--accent-primary)`).
3. **Screen Readers & ARIA**:
   - Icon-only buttons must carry descriptive `aria-label` or `title` attributes.
   - Dynamic progress bars must include `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.
