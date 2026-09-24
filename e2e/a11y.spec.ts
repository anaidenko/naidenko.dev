import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

for (const path of ['/', '/privacy']) {
  test(`${path} has no WCAG 2.1 AA violations`, async ({ page }) => {
    await page.goto(path);
    // #r is Toptal's badge, pasted verbatim; its markup is theirs to fix.
    const results = await new AxeBuilder({ page }).withTags(TAGS).exclude('#r').analyze();
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
  });
}

for (const palette of ['signal', 'ember', 'iris']) {
  test(`palette ${palette} passes colour contrast`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'Contrast does not depend on the viewport');
    await page.goto('/');
    await page.evaluate((value) => document.documentElement.setAttribute('data-palette', value), palette);
    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).exclude('#r').analyze();
    expect(results.violations.flatMap((violation) => violation.nodes.map((node) => node.target.join(' ')))).toEqual([]);
  });
}
