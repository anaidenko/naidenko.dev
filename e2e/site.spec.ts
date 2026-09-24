import { expect, test } from "@playwright/test";

const SECTIONS = ["about", "experience", "open-source", "services", "contact"];

test("renders the name, every section and no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", message => {
        if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Andrii Naidenko" })).toBeVisible();
    for (const id of SECTIONS) await expect(page.locator(`section#${id}`)).toBeAttached();
    await expect(page.locator("section#experience")).toContainText("Buddy Punch");
    expect(errors).toEqual([]);
});

test("links every client and store to the right place", async ({ page }) => {
    await page.goto("/");
    const experience = page.locator("section#experience");
    await expect(experience.getByRole("link", { name: /Buddy Punch/ })).toHaveAttribute("href", "https://buddypunch.com/");
    await expect(experience.getByRole("link", { name: /App Store/ })).toHaveAttribute("href", /apps\.apple\.com/);
    await expect(experience.getByRole("link", { name: /Google Play/ })).toHaveAttribute("href", /play\.google\.com/);
    await expect(page.getByRole("link", { name: /View full résumé on Toptal/ })).toHaveAttribute(
        "href",
        "https://www.toptal.com/developers/resume/andrii-naidenko#qjl3b7"
    );
});

test("opens outside links in a new tab without an opener", async ({ page }) => {
    await page.goto("/");
    // The Toptal badge (#r) is Toptal's verbatim code and is left as they wrote it.
    const links = page.locator('a[target="_blank"]:not(#r a)');
    expect(await links.count()).toBeGreaterThan(5);
    for (const rel of await links.evaluateAll(nodes => nodes.map(node => node.getAttribute("rel") ?? ""))) {
        expect(rel).toContain("noopener");
    }
});

test("highlights the section in view in the navigation", async ({ page, isMobile }) => {
    test.skip(isMobile, "The navigation is desktop-only");
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "In-page navigation" });
    await expect(nav.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "true");
    await page.locator("section#services").evaluate(element => element.scrollIntoView({ block: "start", behavior: "instant" }));
    await expect(nav.getByRole("link", { name: "Services" })).toHaveAttribute("aria-current", "true");
    await expect(nav.getByRole("link", { name: "About" })).not.toHaveAttribute("aria-current", "true");
});

test("copies the install commands", async ({ page, context, isMobile }) => {
    test.skip(isMobile, "Clipboard permissions are granted on desktop only");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await page.getByRole("button", { name: "Copy install commands" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("claude plugin marketplace add anaidenko/claude-plugins");
});

test("is readable without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Andrii Naidenko" })).toBeVisible();
    await expect(page.locator("section#experience")).toContainText("Brokerloop");
    await expect(page.locator('a[href="mailto:hello@naidenko.dev"]').first()).toBeAttached();
    await context.close();
});

test("skip link is the first tab stop and lands on the content", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard navigation is a desktop concern");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#content$/);
});

test("has no horizontal overflow at 320 px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
});

test("puts each number at the top of its cell, whatever the label length", async ({ page }) => {
    await page.goto("/");
    const offsets = await page
        .locator("section#about dl > div")
        .evaluateAll(cells =>
            cells.map(cell => Math.round(cell.querySelector("dd")!.getBoundingClientRect().top - cell.getBoundingClientRect().top))
        );
    expect(offsets).toEqual(offsets.map(() => 0));
});

test("carries the Toptal referral code on every Toptal link", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.locator('a[href*="toptal.com"]').evaluateAll(links => links.map(link => link.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThanOrEqual(3);
    for (const href of hrefs) expect(href).toMatch(/#qjl3b7$/);
});

test("keeps the footer to the copyright and the privacy link", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toContainText("Privacy");
    await expect(footer).not.toContainText("Brittany Chiang");
    await expect(footer).not.toContainText("Built with");
});

test("keeps earlier experience, back to 2007, behind a toggle", async ({ page }) => {
    await page.goto("/");
    const earlier = page.locator("section#experience details");
    await expect(earlier.getByText("EPAM Systems")).toBeHidden();
    await earlier.getByText("Earlier experience").click();
    await expect(earlier.getByText("EPAM Systems")).toBeVisible();
    await expect(earlier).toContainText("2007");
    await expect(earlier).toContainText("GlobalLogic");
});

test("shows the current year in the footer, not the year of the build", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2031-06-01T12:00:00Z"));
    await page.goto("/");
    await expect(page.locator("footer")).toContainText("© 2031");
});
