import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

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

test("the audit page opens its order note without JavaScript, Toptal first", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/audit");
    await expect(page.getByRole("heading", { level: 1, name: "Code audits" })).toBeVisible();
    const toptal = page.getByText("If we met through Toptal, the audit goes through Toptal.");
    await expect(toptal).toBeHidden();
    await page.locator("details#order summary").click();
    await expect(toptal).toBeVisible();
    await expect(page.getByText("Online payment is coming soon", { exact: false })).toBeVisible();
    const lines = await page.locator("details p").allTextContents();
    expect(lines[0]).toBe("If we met through Toptal, the audit goes through Toptal.");
    expect(lines[1]).toContain("online payment is coming soon");
    await expect(page.getByRole("link", { name: "hello@naidenko.dev" })).toHaveAttribute("href", "mailto:hello@naidenko.dev");
    await context.close();
});

test("the audit page has no horizontal overflow at 320 px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/audit");
    await expect(page.getByRole("heading", { level: 1, name: "Code audits" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("links the Auditdesk project to the audit page in the same tab", async ({ page }) => {
    await page.goto("/");
    const link = page.locator("section#projects").getByRole("link", { name: "Auditdesk" });
    await expect(link).toHaveAttribute("href", "/audit");
    await expect(link).not.toHaveAttribute("target", "_blank");
    await expect(link.locator("svg")).toHaveCount(1);
    await expect(page.locator("section#projects").getByRole("link", { name: "claude-video-digest" }).first()).toHaveAttribute(
        "target",
        "_blank"
    );
    await link.click();
    await expect(page).toHaveURL(/\/audit$/);
});

test("the audit page shows the three screenshots with visible captions: the report's opens the sample, the others full size", async ({
    page
}) => {
    await page.goto("/audit");
    const figures = page.locator("main figure");
    await expect(figures).toHaveCount(3);
    await expect(figures.first().getByRole("link", { name: "Open the sample report" })).toHaveAttribute("href", "/audit/sample");
    for (const [index, figure] of (await figures.all()).entries()) {
        const alt = (await figure.locator("img").getAttribute("alt")) ?? "";
        expect(alt.length).toBeGreaterThan(20);
        await expect(figure.locator("figcaption")).toBeVisible();
        expect(((await figure.locator("figcaption").textContent()) ?? "").length).toBeGreaterThan(20);
        if (index > 0) await expect(figure.getByRole("link")).toHaveAttribute("href", /^\/audit\/[a-z-]+\.png$/);
    }
});

test("the audit page opens with the sample report and the order button on the first screen", async ({ page }) => {
    await page.goto("/audit");
    const hero = page.locator("main header");
    await expect(hero.getByRole("link", { name: "See a sample report" })).toHaveAttribute("href", "/audit/sample");
    await expect(hero.getByRole("link", { name: "Order an audit" })).toHaveAttribute("href", "#order");
    const height = page.viewportSize()!.height;
    for (const name of ["See a sample report", "Order an audit"]) {
        const box = await hero.getByRole("link", { name }).boundingBox();
        expect(box!.y + box!.height, name).toBeLessThanOrEqual(height);
    }
});

test("the hero's order button opens the order note", async ({ page }) => {
    await page.goto("/audit");
    await page.locator("main header").getByRole("link", { name: "Order an audit" }).click();
    await expect(page.locator("details#order")).toHaveAttribute("open", "");
    await expect(page.getByText("If we met through Toptal, the audit goes through Toptal.")).toBeInViewport();
});

test("the audit page links the sample report in HTML and PDF", async ({ page }) => {
    await page.goto("/audit");
    const sample = page.locator("section#sample");
    await expect(sample.getByRole("link", { name: "Open the sample report" })).toHaveAttribute("href", "/audit/sample");
    await expect(sample.getByRole("link", { name: "Download it as a PDF" })).toHaveAttribute("href", "/audit/sample-report.pdf");
    const pdf = await page.request.get("/audit/sample-report.pdf");
    expect([pdf.status(), pdf.headers()["content-type"]]).toEqual([200, "application/pdf"]);
});

test("carries a link's tag from the audit page to the sample report and back", async ({ page }) => {
    await page.goto("/audit?ref=e2e-check");
    await expect(page.locator("section#sample").getByRole("link", { name: "Open the sample report" })).toHaveAttribute(
        "href",
        "/audit/sample?ref=e2e-check"
    );
    await page.goto("/audit/sample?ref=e2e-check");
    await expect(page.getByRole("link", { name: "How the audit works" })).toHaveAttribute("href", "/audit?ref=e2e-check");
    await page.goto("/audit/sample");
    await expect(page.getByRole("link", { name: "How the audit works" })).toHaveAttribute("href", "/audit");
    await expect(page.getByRole("link", { name: "Download PDF" })).toHaveAttribute("href", "/audit/sample-report.pdf");
});

test("the sample report is a page of the site whose filters work, from a direct load and from the audit page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", message => {
        if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", error => errors.push(error.message));
    for (const open of [
        () => page.goto("/audit/sample"),
        async () => {
            await page.goto("/audit");
            await page.locator("section#sample").getByRole("link", { name: "Open the sample report" }).click();
        }
    ]) {
        await open();
        await expect(page).toHaveURL(/\/audit\/sample$/);
        await expect(page.getByRole("heading", { level: 1, name: "OWASP Juice Shop v20.2.0" })).toBeVisible();
        await expect(page.getByText("A sample: the full report", { exact: false })).toBeVisible();
        const total = await page.locator(".finding").count();
        expect(total).toBeGreaterThan(10);
        await page.locator("select[name=sev]").selectOption("critical");
        await expect.poll(() => page.locator(".finding:not(.off)").count()).toBeLessThan(total);
        await expect(page.locator(".finding:not(.off)").first()).toBeVisible();
    }
    expect(errors).toEqual([]);
});

test("the sample report's HTML is served only as its page", async ({ request }) => {
    expect((await request.get("/audit/sample-report.html")).status()).toBe(404);
});

test("the sample report fits a phone's width, on a light page", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/audit/sample");
    await expect(page.getByRole("heading", { level: 1, name: "OWASP Juice Shop v20.2.0" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe("rgb(244, 244, 245)");
});

test("the hero's picture is a finding of the sample report it opens", async ({ page }) => {
    await page.goto("/audit");
    const alt = (await page.locator("main header figure img").getAttribute("alt")) ?? "";
    const id = /F-\d{3}/.exec(alt)?.[0];
    expect(id, alt).toBeTruthy();
    await page.goto("/audit/sample");
    await expect(page.locator(`article#${id}`)).toBeVisible();
});

test("opens the order note on a fresh load of /audit#order", async ({ page }) => {
    await page.goto("/audit#order");
    await expect(page.locator("details#order")).toHaveAttribute("open", "");
});

test("shows the hero's buttons in focus from the keyboard", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard navigation is a desktop concern");
    await page.goto("/audit");
    await page.getByRole("link", { name: "← Andrii Naidenko" }).focus();
    for (const name of ["See a sample report", "Order an audit"]) {
        await page.keyboard.press("Tab");
        const button = page.locator("main header").getByRole("link", { name });
        await expect(button).toBeFocused();
        // The colour eases in with the button's transition.
        await expect
            .poll(() => button.evaluate(element => getComputedStyle(element).outlineColor), { message: name })
            .toBe("rgb(190, 242, 100)");
    }
});

test("the sample report looks as exported: headings, numbered contents and bulleted method", async ({ page, browser }) => {
    const exported = await browser.newPage();
    await exported.setContent(readFileSync("src/content/audit/sample-report.html", "utf8"));
    await page.goto("/audit/sample");
    const styles = (target: typeof page) =>
        target.evaluate(() =>
            [".cover h1", "#summary h2", ".toc ol", "ul.method", "pre"].map(selector => {
                const style = getComputedStyle(document.querySelector(selector)!);
                return [selector, style.fontWeight, style.listStyleType, style.marginTop, style.fontFamily].join(" | ");
            })
        );
    expect(await styles(page)).toEqual(await styles(exported));
    await exported.close();
});

test("the sample report's Expand all opens every card, once", async ({ page }) => {
    await page.goto("/audit/sample");
    const total = await page.locator(".finding > .body").count();
    await page.locator(".filters button.all").click();
    await expect.poll(() => page.locator(".finding > .body[open]").count()).toBe(total);
    await expect(page.locator(".filters button.all")).toHaveText("Collapse all");
});
