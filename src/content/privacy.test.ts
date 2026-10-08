import { describe, expect, it } from "vitest";

import { asToptalBuild } from "@/lib/toptal-build.testing";

import { privacy } from "./privacy";

const text = (note: typeof privacy) => note.sections.flatMap(section => [section.title, ...section.paragraphs]).join("\n");

describe("privacy", () => {
    it("names privacy@naidenko.dev as text on naidenko.dev, with its contact form's sections", () => {
        expect(text(privacy)).toContain("write to privacy@naidenko.dev.");
        expect(text(privacy)).not.toContain("hello@");
        expect(privacy.sections.map(section => section.title)).toContain("What the contact form collects");
    });

    it("describes the Toptal build, which has no form: no Turnstile, Slack or contact button", async () => {
        const { privacy: toptal } = await asToptalBuild(() => import("./privacy"));
        expect(text(toptal)).toContain("write to privacy@naidenko.dev.");
        expect(text(toptal)).not.toMatch(/contact form|Turnstile|Slack|Contact me|linkedin/i);
        expect(text(toptal)).toContain("(such as ?ref=123456)");
        expect(toptal.description).toBe("What toptal.naidenko.dev records about a visit, why, and for how long.");
        expect(toptal.sections.map(section => section.title)).toEqual([
            "Who is responsible",
            "Who else handles it",
            "Visit counts, without cookies",
            "Your rights"
        ]);
    });
});
