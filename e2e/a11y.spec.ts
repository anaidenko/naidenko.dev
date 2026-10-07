import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

for (const path of ["/", "/privacy", "/audit"]) {
    test(`${path} has no WCAG 2.1 AA violations`, async ({ page }) => {
        expect((await page.goto(path))?.status()).toBe(200);
        // #r is Toptal's badge, pasted verbatim; its markup is theirs to fix.
        const results = await new AxeBuilder({ page }).withTags(TAGS).exclude("#r").analyze();
        expect(results.violations.map(violation => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
    });
}

test("/audit has no WCAG 2.1 AA violations with the order note open", async ({ page }) => {
    await page.goto("/audit");
    await page.getByText("Order an audit").click();
    await expect(page.getByText("If we met through Toptal, the audit goes through Toptal.")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(results.violations.map(violation => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});
