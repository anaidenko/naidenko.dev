import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIRS = ["public/audit", "src/content/audit"].map(dir => join(process.cwd(), dir));
// A top-level domain of letters only, so "lodash@4.17.21" in a dependency finding is not an address.
const ADDRESS = /[\w.+-]+@(?!naidenko\.dev\b)[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b/i;
// A home folder, not a route such as Juice Shop's /api/Users/:id.
const HOME = /(?<!\w)\/Users\/\w/;
const FORBIDDEN = [HOME, /sk-ant-/, ADDRESS];
// F-054's explanation shows two addresses that differ only in vowels, as made-up examples.
const EXAMPLES = ["bob@x.io", "bab@x.ia"];

describe("the leak patterns", () => {
    it("pass a package version and catch an address", () => {
        expect("lodash@4.17.21 and express-jwt@0.1.3").not.toMatch(ADDRESS);
        expect("write to a@b.com").toMatch(ADDRESS);
        expect("hello@naidenko.dev").not.toMatch(ADDRESS);
    });
    it("catch a home folder and pass a route", () => {
        expect("cloned from /Users/jane/work/app").toMatch(HOME);
        expect("file:///Users/jane/app").toMatch(HOME);
        expect("GET /api/Users/:id").not.toMatch(HOME);
    });
});

const htmlFiles = DIRS.flatMap(dir =>
    readdirSync(dir)
        .filter(name => name.endsWith(".html"))
        .map(name => join(dir, name))
);

describe("the sample report's files", () => {
    it("are the HTML for the page and the PDF to download", () => {
        expect(readdirSync(DIRS[0])).toContain("sample-report.pdf");
        expect(readdirSync(DIRS[1])).toContain("sample-report.html");
    });
    it.each(htmlFiles)("%s carries no local path, key or address", file => {
        const text = EXAMPLES.reduce((rest, example) => rest.replaceAll(example, ""), readFileSync(file, "utf8"));
        for (const pattern of FORBIDDEN) expect(text).not.toMatch(pattern);
    });
});
