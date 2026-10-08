import { describe, expect, it } from "vitest";

import { onOrigin, sampleReport, splitReport } from "./sample-report";

const report = (extra = "") =>
    `<!doctype html><html><head><style>body{margin:0}</style></head><body><main class="doc"><h1>App</h1><form class="filters" onsubmit="return false"></form></main>${extra}<script>(()=>{})()</script></body></html>`;

describe("splitReport", () => {
    it("takes the report's style, its main markup and its script", () => {
        const { style, main, script } = splitReport(report());
        expect(style).toBe("body{margin:0}");
        expect(main).toContain("<h1>App</h1>");
        expect(main).not.toContain('<main class="doc">');
        expect(script).toBe("(()=>{})()");
    });

    it("counts a click in the report's filters", () => {
        expect(splitReport(report()).main).toContain('<form class="filters" data-track="sample_filter" onsubmit="return false">');
    });

    it("refuses a report the renderer no longer emits in one piece each", () => {
        expect(() => splitReport(report("<script>x()</script>"))).toThrow(/one <script>/);
        expect(() => splitReport(report().replace("<style>", "<style>a{}</style><style>"))).toThrow(/one <style>/);
        expect(() => splitReport(report().replace('<main class="doc">', "<main>"))).toThrow(/<main class="doc">/);
        expect(() => splitReport(report('<script type="module">x()</script>'))).toThrow(/script/);
        expect(() => splitReport(report().replace("</style>", '</style><style media="print">a{}</style>'))).toThrow(/style/);
        expect(() => splitReport(report("<p>outside</p>"))).toThrow(/outside/);
    });
});

describe("sampleReport", () => {
    it("reads the exported sample: a report of OWASP Juice Shop with its filters", () => {
        const { main, script } = sampleReport();
        expect(main).toContain("OWASP Juice Shop");
        expect(main).toContain('name="sev"');
        expect(script).toContain("beforeprint");
        expect(main).toContain('data-track="sample_filter"');
    });
});

describe("onOrigin", () => {
    const html =
        '<dd><a href="https://naidenko.dev/">Andrii Naidenko</a></dd><li><a href="https://naidenko.dev/audit">naidenko.dev/audit</a>.</li>';

    it("moves the report's links to the site, and the one it prints, to the build's own host", () => {
        expect(onOrigin(html, "https://toptal.naidenko.dev")).toBe(
            '<dd><a href="https://toptal.naidenko.dev/">Andrii Naidenko</a></dd><li><a href="https://toptal.naidenko.dev/audit">toptal.naidenko.dev/audit</a>.</li>'
        );
    });

    it("leaves the report as exported on naidenko.dev", () => {
        expect(onOrigin(html, "https://naidenko.dev")).toBe(html);
    });
});
