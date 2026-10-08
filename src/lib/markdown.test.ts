import { describe, expect, it } from "vitest";

import { llmsTxt, pageMarkdown } from "./markdown";

describe("pageMarkdown", () => {
    const md = pageMarkdown();

    it("opens with the name and carries every section of the page", () => {
        expect(md.startsWith("# Andrii Naidenko\n")).toBe(true);
        for (const heading of ["## About", "## What clients said", "## Experience", "## Projects", "## Services", "## Contact"]) {
            expect(md).toContain(`\n${heading}\n`);
        }
    });

    it("keeps the facts a reader checks: roles, reviews and links", () => {
        for (const part of ["Buddy Punch", "Brokerloop", "Earlier experience", "Bruce van Zyl", "claude-video-digest"]) {
            expect(md).toContain(part);
        }
        expect(md).toContain("(https://www.toptal.com/developers/resume/andrii-naidenko#qjl3b7)");
    });

    it("gives no email address and no form, which an agent sent from Toptal would read", () => {
        expect(md).not.toContain("@naidenko.dev");
        expect(md).not.toContain("#contact");
    });

    it("links a project on the site by its full address", () => {
        expect(md).toContain("### [Auditdesk](https://naidenko.dev/audit)");
    });

    it("is plain Markdown, with no HTML and no empty values", () => {
        expect(md).not.toMatch(/<\/?[a-z][^>]*>/i);
        expect(md).not.toMatch(/undefined|null|\[object/);
    });
});

describe("llmsTxt", () => {
    it("follows llms.txt: a title, a summary quote, then sections of links", () => {
        const txt = llmsTxt();
        expect(txt.startsWith("# Andrii Naidenko\n\n> ")).toBe(true);
        expect(txt).toContain("(https://naidenko.dev/index.md)");
        expect(txt).toMatch(/\n## [^\n]+\n\n- \[/);
    });

    it("gives no email address", () => {
        expect(llmsTxt()).not.toContain("@naidenko.dev");
    });

    it("lists the code-audit page and its sample report", () => {
        expect(llmsTxt()).toContain("(https://naidenko.dev/audit)");
        expect(llmsTxt()).toContain("(https://naidenko.dev/audit/sample)");
    });
});
