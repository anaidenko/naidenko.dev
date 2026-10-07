import { readFileSync } from "node:fs";
import { join } from "node:path";

export const SAMPLE_REPORT = "src/content/audit/sample-report.html";

/** The parts of an exported report the sample's page renders: its style, its main markup and its script. */
export interface ReportParts {
    style: string;
    main: string;
    script: string;
}

function one(html: string, pattern: RegExp, what: string): string {
    const found = [...html.matchAll(pattern)];
    if (found.length !== 1) throw new Error(`Expected one ${what} in the report, found ${found.length}: has Auditdesk's renderer changed?`);
    return found[0][1];
}

/**
 * Splits a report as Auditdesk's renderReport emits it (one <style>, one <main class="doc">, one
 * <script>); anything else stops the build rather than shipping a broken page.
 */
export function splitReport(html: string): ReportParts {
    const main = one(html, /<main class="doc">([\s\S]*?)<\/main>/g, '<main class="doc">');
    return {
        style: one(html, /<style>([\s\S]*?)<\/style>/g, "<style>"),
        main: main.replace('<form class="filters"', '<form class="filters" data-track="sample_filter"'),
        script: one(html, /<script>([\s\S]*?)<\/script>/g, "<script>")
    };
}

/** The exported sample, read at build time. */
export function sampleReport(): ReportParts {
    return splitReport(readFileSync(join(process.cwd(), SAMPLE_REPORT), "utf8"));
}
