// Usage: node scripts/toptal-pdf.mjs <report.html> <out.pdf> <origin>
// The sample report's PDF for the Toptal build. The exported PDF links naidenko.dev, which the
// Toptal build links nowhere, so this prints the report again with its links on <origin>
// (src/lib/sample-report.ts, onOrigin), the way Auditdesk prints it (src/engine/report/pdf.ts:
// the report's own print style, its footer, page numbers).
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const EXPORTED_ORIGIN = "https://naidenko.dev";

/** The report's links to the site, and the one it prints, moved to `origin`. */
export function onOrigin(html, origin) {
    const host = url => new URL(url).host;
    return html.replaceAll(`"${EXPORTED_ORIGIN}/`, `"${origin}/`).replaceAll(`>${host(EXPORTED_ORIGIN)}/`, `>${host(origin)}/`);
}

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

const escapeHtml = text =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * Auditdesk's footer, "Code audit: <project> · <date>", from the report's title and its colophon's
 * date. The title is unescaped here, since renderPdf escapes the footer as Auditdesk does.
 */
export function footerOf(html) {
    const title = /<title>([^<]*)<\/title>/.exec(html)?.[1];
    const date = /<p class="colophon">[\s\S]*?(\d{4}-\d{2}-\d{2})<\/p>/.exec(html)?.[1];
    if (!title || !date) throw new Error("The report has no <title> or no dated colophon: has Auditdesk's renderer changed?");
    return `${title.replace(/&(?:amp|lt|gt|quot|#39);/g, entity => ENTITIES[entity])} · ${date}`;
}

export async function renderPdf(html, footer) {
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        // The report is one self-contained file: it needs nothing from the network.
        await page.route("**/*", route => route.abort());
        await page.setContent(html, { waitUntil: "load" });
        return await page.pdf({
            preferCSSPageSize: true,
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: "<span></span>",
            footerTemplate: `<div style="width:100%;margin:0 15mm;display:flex;justify-content:space-between;font:8px system-ui,sans-serif;color:#a1a1aa"><span>${escapeHtml(footer)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`
        });
    } finally {
        await browser.close();
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [input, output, origin] = process.argv.slice(2);
    if (!input || !output || !origin) {
        console.error("usage: node scripts/toptal-pdf.mjs <report.html> <out.pdf> <origin>");
        process.exit(2);
    }
    const html = readFileSync(input, "utf8");
    writeFileSync(output, await renderPdf(onOrigin(html, origin), footerOf(html)));
}
