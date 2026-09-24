import { expect, test } from "@playwright/test";

const SECTIONS = ["about", "experience", "projects", "services", "contact"];

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

test("puts each number at the top of its tile, whatever the label length", async ({ page }) => {
    await page.goto("/");
    const offsets = await page
        .locator("section#about dl > div")
        .evaluateAll(cells =>
            cells.map(cell => Math.round(cell.querySelector("dd")!.getBoundingClientRect().top - cell.getBoundingClientRect().top))
        );
    expect(new Set(offsets).size).toBe(1);
});

test("fits every number inside its tile, at every layout width", async ({ page, isMobile }) => {
    const widths = isMobile ? [page.viewportSize()!.width] : [1024, 1280, 1440];
    for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/");
        const overflows = await page.locator("section#about dl > div").evaluateAll(cells =>
            cells.map(cell => {
                const style = getComputedStyle(cell);
                const inner = cell.getBoundingClientRect().right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth);
                return Math.max(0, Math.ceil(cell.querySelector("dd")!.getBoundingClientRect().right - inner));
            })
        );
        expect(overflows, `at ${width} px`).toEqual(overflows.map(() => 0));
    }
});

test("shows the portrait at 150 px or more on desktop", async ({ page, isMobile }) => {
    test.skip(isMobile, "The portrait is smaller on phones by design");
    await page.goto("/");
    const box = await page.locator("header img").first().boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(150);
    expect(box!.height).toBe(box!.width);
});

test("puts the Toptal verification right under the role, linked to the profile", async ({ page }) => {
    await page.goto("/");
    const role = page.locator("header p", { hasText: "Full-stack and Mobile Developer" });
    const verified = role.locator("xpath=following-sibling::p[1]");
    await expect(verified.locator("svg")).toBeAttached();
    const link = verified.getByRole("link");
    await expect(link).toHaveText("Verified Expert in Engineering at Toptal");
    await expect(link).toHaveAttribute("href", "https://www.toptal.com/developers/resume/andrii-naidenko#qjl3b7");
    await expect(verified).toContainText("Athens, Greece");
});

test("keeps the header's button and links in view on laptop screens", async ({ page, isMobile }) => {
    test.skip(isMobile, "The header is sticky on desktop only");
    for (const [width, height] of [
        [1440, 800],
        [1280, 700]
    ]) {
        await page.setViewportSize({ width, height });
        await page.goto("/");
        for (const name of ["Contact me", "Email"]) {
            const box = await page.locator("header").getByRole("link", { name, exact: true }).boundingBox();
            expect(box!.y + box!.height, `${name} at ${width}×${height}`).toBeLessThanOrEqual(height);
        }
    }
});

test("leads Projects with the client system and links the marketplace from the install block", async ({ page }) => {
    await page.goto("/");
    const projects = page.locator("section#projects");
    const titles = await projects.locator("article h3").allTextContents();
    expect(titles[0]).toBe("AI-native engineering system");
    await expect(projects.locator("article").first().getByRole("link")).toHaveCount(0);
    expect(titles).not.toContain("claude-plugins");
    await expect(projects.getByRole("link", { name: "claude-plugins" })).toHaveAttribute(
        "href",
        "https://github.com/anaidenko/claude-plugins"
    );
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

test("quotes three repeat clients by name under the numbers, each with a rating", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("section#about figure")).toHaveCount(3);
    for (const name of ["Bruce van Zyl", "Chris Robichaud", "Alex Harper"]) {
        const caption = page.locator("section#about figcaption", { hasText: name });
        await expect(caption).toContainText("Rated 5 out of 5.");
        await expect(caption).toContainText(/Hired me (six|three) times on Upwork/);
    }
});
