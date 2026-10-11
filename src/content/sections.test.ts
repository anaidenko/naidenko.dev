import { describe, expect, it } from "vitest";

import { menu } from "./sections";

describe("menu", () => {
    it("puts Code audit under Services on both builds", () => {
        expect(menu(false).map(entry => entry.label)).toEqual(["About", "Experience", "Projects", "Services", "Code audit", "Contact"]);
        expect(menu(true).map(entry => entry.label)).toEqual(["About", "Experience", "Projects", "Services", "Code audit", "Hire"]);
    });

    it("points Code audit at its service and the last entry at its build's section", () => {
        expect(menu(false).map(entry => entry.id)).toEqual(["about", "experience", "projects", "services", "code-audit", "contact"]);
        expect(menu(true).at(-1)?.id).toBe("hire");
    });
});
