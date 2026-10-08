import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { TOPTAL_URL } from "./servers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const TOPTAL = ["/", "/privacy", "/audit", "/audit/sample"].map(path => `${TOPTAL_URL}${path}`);

for (const path of ["/", "/privacy", "/audit", "/audit/sample", ...TOPTAL]) {
    test(`${path} has no WCAG 2.1 AA violations`, async ({ page }) => {
        expect((await page.goto(path))?.status()).toBe(200);
        // #r is Toptal's badge, pasted verbatim; its markup is theirs to fix.
        const results = await new AxeBuilder({ page }).withTags(TAGS).exclude("#r").analyze();
        expect(results.violations.map(violation => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
    });
}
