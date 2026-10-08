import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SAMPLE_REPORT, onOrigin as pageOnOrigin } from "../src/lib/sample-report";

import { footerOf, onOrigin } from "./toptal-pdf.mjs";

const html = readFileSync(SAMPLE_REPORT, "utf8");
const TOPTAL = "https://toptal.naidenko.dev";

describe("toptal-pdf", () => {
    it("moves the sample's links as its page does, leaving none on naidenko.dev", () => {
        const moved = onOrigin(html, TOPTAL);
        expect(moved).toBe(pageOnOrigin(html, TOPTAL));
        expect(moved.replaceAll("toptal.naidenko.dev", "")).not.toContain("naidenko.dev");
        expect(moved).toContain(`href="${TOPTAL}/audit"`);
    });

    it("prints Auditdesk's footer: the report's title and date", () => {
        expect(footerOf(html)).toBe("Code audit: OWASP Juice Shop v20.2.0 · 2026-10-07");
    });

    it("refuses a report without a title or a dated colophon", () => {
        expect(() => footerOf("<html><body></body></html>")).toThrow(/colophon/);
    });
});
