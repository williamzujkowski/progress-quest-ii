import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * The single way *both* suites run an accessibility audit — `e2e/` and `e2e-pwa/` alike.
 *
 * It exists because the same defect has now been found three times in three different costumes:
 * an axe pass measuring colours from mid-cross-fade. Themes transition over 200ms, so an audit
 * that runs straight after a theme change samples a frame no user ever sees, and reports a wall
 * of contrast violations that are not real — or, worse, passes while the page is momentarily
 * showing the previous palette.
 *
 * Each time it was fixed at one call site. There are twelve, and the next person to add a
 * thirteenth would have had no way to know. So the guard lives here instead of in the tests:
 * disabling transitions is not an argument the caller can forget to make.
 *
 * The PWA suite is named explicitly because it had already drifted: three audits in
 * `e2e-pwa/pwa.spec.ts` were built inline with their own `AxeBuilder` and their own copy of the
 * tag list, and so carried neither guard below. "This suite" was read as the directory
 * this file sits in. It is not — `e2e-pwa/` imports across the boundary for other fixtures too,
 * and any suite auditing this application belongs here.
 *
 * `expectNoViolations` is deliberately the exported shape rather than a builder — returning
 * results would let a caller collect them and forget to assert, which is the vacuous-pass
 * failure this repo has spent a while removing.
 */

const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Removes the animation window an audit could otherwise sample inside. Safe to call repeatedly.
 *
 * Adopted via a constructed stylesheet rather than `page.addStyleTag`, which appends a `<style>`
 * element and is therefore refused by `style-src 'self'`. The application needs no inline styles —
 * React writes CSSOM properties, which CSP does not govern — so the only thing that was holding
 * `'unsafe-inline'` in the shipped policy was this helper. Weakening what users receive to let a
 * test fixture take a shortcut is the wrong way round.
 *
 * `CSSStyleSheet` built in the page and adopted onto the document is not subject to `style-src`
 * at all, and it replaces cleanly on repeat calls rather than stacking `<style>` elements.
 */
export const settleForAudit = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('*, *::before, *::after { transition: none !important; animation: none !important; }');
    const existing = document.adoptedStyleSheets.filter((adopted) => adopted !== sheet);
    document.adoptedStyleSheets = [...existing, sheet];
  });
};

export const expectNoViolations = async (page: Page, context?: string): Promise<void> => {
  await settleForAudit(page);

  // Under forced colors the user agent owns the palette: it repaints controls with the system
  // Highlight and HighlightText colours and ignores the authored ones. Asserting a contrast ratio
  // there measures the platform's choices rather than this project's, and engines disagree about
  // which controls to repaint at all — WebKit fills a selected tab where Chromium leaves it. The
  // rule is switched off rather than the audit skipped, so everything else still runs.
  //
  // Detected here rather than passed in, on the same reasoning as the transition guard above:
  // this is not an argument a caller should be able to forget.
  //
  // Best-effort, because one caller audits a page whose render was deliberately crashed and any
  // evaluate there re-raises that pending error. Failing to detect falls back to keeping the rule
  // enabled, which is the stricter of the two outcomes - a detection fault must not quietly widen
  // what the audit accepts.
  const forcedColors = await page
    .evaluate(() => matchMedia('(forced-colors: active)').matches)
    .catch(() => false);

  const builder = new AxeBuilder({ page }).withTags(WCAG_AA_TAGS);
  const results = await (forcedColors ? builder.disableRules(['color-contrast']) : builder).analyze();

  // axe reports `incomplete` for elements whose background it cannot resolve — the navbar, for
  // one, because its buttons contain inline SVG. Those are not violations and are not asserted
  // here; e2e/contrast.spec.ts measures those pairs directly for exactly that reason.
  expect(results.violations, context ? `${context}: accessibility violations` : 'accessibility violations').toEqual([]);
};
