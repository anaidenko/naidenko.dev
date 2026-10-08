export type SectionId = "about" | "experience" | "projects" | "services" | "contact" | "hire";

/**
 * The home page's sections in their order, with their labels. The last is "contact" on
 * naidenko.dev and "hire" on the Toptal build, where it holds only the badge.
 */
export const sections: readonly { id: SectionId; label: string }[] = [
    { id: "about", label: "About" },
    { id: "experience", label: "Experience" },
    { id: "projects", label: "Projects" },
    { id: "services", label: "Services" },
    { id: "contact", label: "Contact" },
    { id: "hire", label: "Hire" }
];

/** The id on the Auditdesk project, which the menu's "Code audit" scrolls to. */
export const AUDITDESK_ID = "auditdesk";

/**
 * One build's in-page menu: its sections, with "Code audit" under Projects. A plain function of
 * the build, since the Worker imports this file and cannot read the build's variable.
 */
export function menu(toptalSite: boolean): readonly { id: string; label: string }[] {
    const own = sections.filter(section => section.id !== (toptalSite ? "contact" : "hire"));
    const projects = own.findIndex(section => section.id === "projects") + 1;
    return [...own.slice(0, projects), { id: AUDITDESK_ID, label: "Code audit" }, ...own.slice(projects)];
}
