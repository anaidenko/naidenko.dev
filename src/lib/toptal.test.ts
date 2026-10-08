import { describe, expect, it } from "vitest";

import { isToptalLink } from "../../worker/toptal";

import { TOPTAL_ATTRIBUTE, toptalScript, toptalTag } from "./toptal";

/** Runs the inline script against a fake page and returns the mark it leaves on <html>. */
function runScript(search: string, toptalSite: boolean): string | null {
    const attributes = new Map<string, string>();
    const document = { documentElement: { setAttribute: (name: string, value: string) => attributes.set(name, value) } };
    new Function("location", "document", toptalScript(toptalSite))({ search }, document);
    return attributes.get(TOPTAL_ATTRIBUTE) ?? null;
}

/** On naidenko.dev: only a link tagged on Toptal marks the visit. */
const SITE: [search: string, tag: string | null][] = [
    ["?ref=toptal", "toptal"],
    ["?ref=Toptal-509168", "toptal-509168"],
    ["?utm_source=toptal", "toptal"],
    ["?utm_source=a&ref=toptal-1", "toptal-1"],
    ["?ref=&utm_source=toptal", "toptal"],
    ["?ref=linkedin", null],
    ["?ref=xtoptal", null],
    ["", null]
];

/** On the Toptal build: every visit, a bare tag such as a job's ID read as toptal-<tag>. */
const TOPTAL_BUILD: [search: string, tag: string][] = [
    ["", ""],
    ["?ref=509168", "toptal-509168"],
    ["?ref=toptal-509168", "toptal-509168"],
    ["?ref=Toptal", "toptal"],
    ["?utm_source=Newsletter", "toptal-newsletter"],
    [`?ref=${"9".repeat(40)}`, `toptal-${"9".repeat(33)}`]
];

describe("toptalTag", () => {
    it("marks a link tagged on Toptal on naidenko.dev", () => {
        for (const [search, tag] of SITE) expect(toptalTag(search, false), search).toBe(tag);
    });

    it("marks every visit to the Toptal build, with its tag as the counter keeps it", () => {
        for (const [search, tag] of TOPTAL_BUILD) expect(toptalTag(search, true), search).toBe(tag);
    });
});

describe("the Worker's isToptalLink", () => {
    it("follows the same rule on naidenko.dev, where the Worker moves a tagged page to the Toptal host", () => {
        for (const [search, tag] of [...SITE, ["?ref=%20toptal", "toptal"] as const])
            expect(isToptalLink(search), search).toBe(tag !== null);
    });
});

describe("toptalScript", () => {
    it("marks <html> by the same rule, before any module loads", () => {
        for (const [search, tag] of SITE) expect(runScript(search, false), search).toBe(tag);
        for (const [search, tag] of TOPTAL_BUILD) expect(runScript(search, true), search).toBe(tag);
    });

    it("leaves the page alone when the browser lacks what it needs", () => {
        for (const toptalSite of [false, true])
            expect(() => new Function("location", "document", toptalScript(toptalSite))(undefined, undefined)).not.toThrow();
    });
});
