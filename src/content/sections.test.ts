import { describe, expect, it } from "vitest";

import { menu } from "./sections";

describe("menu", () => {
    it("puts Code audit under Projects on both builds", () => {
        expect(menu(false).map(entry => entry.label)).toEqual(["About", "Experience", "Projects", "Code audit", "Services", "Contact"]);
        expect(menu(true).map(entry => entry.label)).toEqual(["About", "Experience", "Projects", "Code audit", "Services", "Hire"]);
    });

    it("points Code audit at the Auditdesk project and the last entry at its build's section", () => {
        expect(menu(false).map(entry => entry.id)).toEqual(["about", "experience", "projects", "auditdesk", "services", "contact"]);
        expect(menu(true).at(-1)?.id).toBe("hire");
    });
});
