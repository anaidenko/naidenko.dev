import { describe, expect, it } from "vitest";

import { TOPTAL_ATTRIBUTE, TOPTAL_SCRIPT, toptalTag } from "./toptal";

/** Runs the inline script against a fake page and returns the mark it leaves on <html>. */
function runScript(search: string, hostname: string): string | null {
    const attributes = new Map<string, string>();
    const document = { documentElement: { setAttribute: (name: string, value: string) => attributes.set(name, value) } };
    new Function("location", "document", TOPTAL_SCRIPT)({ search, hostname }, document);
    return attributes.get(TOPTAL_ATTRIBUTE) ?? null;
}

const CASES: [search: string, hostname: string, tag: string | null][] = [
    ["?ref=toptal", "naidenko.dev", "toptal"],
    ["?ref=Toptal-509168", "naidenko.dev", "toptal-509168"],
    ["?utm_source=toptal", "naidenko.dev", "toptal"],
    ["?utm_source=a&ref=toptal-1", "naidenko.dev", "toptal-1"],
    ["?ref=&utm_source=toptal", "naidenko.dev", "toptal"],
    ["?ref=linkedin", "naidenko.dev", null],
    ["?ref=xtoptal", "naidenko.dev", null],
    ["", "naidenko.dev", null],
    ["", "nottoptal.naidenko.dev", null],
    ["", "toptal.naidenko.dev", ""],
    ["?ref=linkedin", "toptal.naidenko.dev", ""],
    ["?ref=toptal-1", "toptal.naidenko.dev", "toptal-1"]
];

describe("toptalTag", () => {
    it("marks a link tagged on Toptal, and any visit to the host made for Toptal's links", () => {
        for (const [search, hostname, tag] of CASES) expect(toptalTag(search, hostname), `${search} on ${hostname}`).toBe(tag);
    });
});

describe("TOPTAL_SCRIPT", () => {
    it("marks <html> by the same rule, before any module loads", () => {
        for (const [search, hostname, tag] of CASES) expect(runScript(search, hostname), `${search} on ${hostname}`).toBe(tag);
    });

    it("leaves the page alone when the browser lacks what it needs", () => {
        expect(() => new Function("location", "document", TOPTAL_SCRIPT)(undefined, undefined)).not.toThrow();
    });
});
