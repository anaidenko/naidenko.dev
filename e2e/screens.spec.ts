import { mkdirSync } from 'node:fs';
import { test } from '@playwright/test';

test.skip(!process.env.SCREENS, 'Set SCREENS=1 to render the review screenshots');

const PALETTES = ['signal', 'ember', 'iris'];

for (const palette of PALETTES) {
  test(`screens: ${palette}`, async ({ page, isMobile }) => {
    mkdirSync('screenshots', { recursive: true });
    await page.goto('/');
    await page.evaluate((value) => document.documentElement.setAttribute('data-palette', value), palette);
    await page.evaluate(() => document.fonts.ready);
    if (isMobile) {
      await page.screenshot({ path: `screenshots/${palette}-mobile.png` });
      return;
    }
    await page.evaluate(() => {
      const spot = document.querySelector<HTMLElement>('.spotlight');
      spot?.style.setProperty('--spot-x', '420px');
      spot?.style.setProperty('--spot-y', '260px');
    });
    await page.screenshot({ path: `screenshots/${palette}-desktop.png` });
    await page.locator('section#experience').evaluate((element) => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.mouse.move(1000, 420);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `screenshots/${palette}-desktop-experience.png` });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `screenshots/${palette}-full.png`, fullPage: true });
  });
}
