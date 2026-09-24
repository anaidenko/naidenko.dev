---
name: a11y
description: Audit a page, component or change for accessibility (WCAG 2.1 AA) — keyboard, focus, contrast, labels, landmarks, motion, touch targets — and run the axe tests. Use when asked to check accessibility, contrast, keyboard or screen-reader behaviour.
allowed-tools: Read, Glob, Grep, Bash(pnpm exec playwright test *)
---

# Accessibility audit

Audit the target in $ARGUMENTS: a file, a component or the current diff.

1. **Run axe.** Run `pnpm exec playwright test e2e/a11y.spec.ts` (after `pnpm test:e2e` has
   built the site) and read every violation.
2. **Check what axe cannot see:**
    - **Keyboard:** every action is reachable with Tab, in visual order. The skip link comes
      first, and focus is always visible (`focus-visible` styles).
    - **Names:** icon-only links and buttons have `aria-label`. Form fields have a `<label>`,
      and each error is tied to its field with `aria-describedby`.
    - **Images:** decorative images have `alt=""`; informative ones describe what they show.
    - **Changes:** results appear in `role="status"` or `role="alert"`, and nothing important
      is carried by colour alone.
    - **Motion:** animation respects `prefers-reduced-motion`.
    - **Touch:** targets are at least 44×44 px on mobile.
    - **Contrast:** 4.5:1 for text, 3:1 for large text and UI parts, hover and focus states
      included.
3. **Report** the issues grouped as Critical, Major and Minor, each with the file, the problem
   and the fix. When a check can be automated, add a test.
