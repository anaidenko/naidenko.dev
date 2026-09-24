import { aboutParagraphs, numbers } from "@/content/about";
import { contact } from "@/content/contact";
import { type ExperienceEntry, earlierExperience, experience, fullResume } from "@/content/experience";
import { installCommands, marketplace, projects, projectsIntro } from "@/content/projects";
import { services } from "@/content/services";
import { site } from "@/content/site";
import { testimonials } from "@/content/testimonials";
import { ui } from "@/content/ui";

const link = (text: string, url: string) => `[${text}](${url})`;

function role(entry: ExperienceEntry): string {
    const company = entry.url ? link(entry.company, entry.url) : entry.company;
    const stores = entry.links?.map(store => link(store.label, store.url)).join(" · ");
    return [
        `### ${entry.role} · ${company}`,
        "",
        `${entry.period}. ${entry.summary}`,
        ...(stores ? ["", stores] : []),
        "",
        `Stack: ${entry.chips.join(", ")}.`,
        ""
    ].join("\n");
}

/** The whole page as Markdown, for agents that ask for it (Accept: text/markdown) and for /index.md. */
export function pageMarkdown(): string {
    return [
        `# ${site.name}`,
        "",
        `${site.role}. ${site.verified.lead} ${site.verified.rest} · ${site.location}.`,
        "",
        `> ${site.tagline}`,
        "",
        "## About",
        "",
        ...aboutParagraphs.flatMap(paragraph => [paragraph, ""]),
        ...numbers.map(({ value, label }) => `- **${value}** ${label}`),
        "",
        `## ${testimonials.heading}`,
        "",
        ...testimonials.items.flatMap(item => [
            `> ${item.quote}`,
            ">",
            `> — ${item.name}${"project" in item ? `, ${item.project}` : ""}. ${item.hired}. Rated ${item.rating} out of 5.`,
            ""
        ]),
        "## Experience",
        "",
        ...experience.map(role),
        `### ${ui.earlierExperience}`,
        "",
        ...earlierExperience.map(entry => role(entry).replace(/^### /, "#### ")),
        link(fullResume.label, fullResume.url),
        "",
        "## Projects",
        "",
        projectsIntro,
        "",
        ...projects.flatMap(project => [
            `### ${project.url ? link(project.name, project.url) : project.name}`,
            "",
            ...(project.note ? [`${project.note}.`, ""] : []),
            project.description,
            "",
            `Stack: ${project.chips.join(", ")}.`,
            ""
        ]),
        `${marketplace.lead} ${link(marketplace.name, marketplace.url)}:`,
        "",
        "```sh",
        ...installCommands,
        "```",
        "",
        "## Services",
        "",
        ...services.flatMap(service => [`### ${service.title}`, "", service.text, "", `${ui.proof}: ${service.proof}.`, ""]),
        "## Contact",
        "",
        `${contact.intro} Email ${link(site.email, `mailto:${site.email}`)}, or use the form at ${site.url}/#contact.`,
        "",
        `${contact.toptalHeading} ${link("Hire me on Toptal", site.links.toptalReferral)}.`,
        "",
        `Elsewhere: ${link("GitHub", site.links.github)} · ${link("LinkedIn", site.links.linkedin)}.`,
        ""
    ].join("\n");
}

/** /llms.txt (llmstxt.org): what the site is, and where the full text lives. */
export function llmsTxt(): string {
    return [
        `# ${site.name}`,
        "",
        `> ${site.description}`,
        "",
        `${site.role}, ${site.verified.lead} ${site.verified.rest}, based in ${site.location}. Contact: ${site.email}.`,
        "",
        "## Pages",
        "",
        `- ${link("The whole page in Markdown", `${site.url}/index.md`)}: about, experience, client reviews, projects, services and contact`,
        `- ${link("Privacy note", `${site.url}/privacy`)}: what the contact form and the visit counters collect`,
        "",
        "## Profiles",
        "",
        `- ${link("Toptal", site.links.toptalReferral)}: the full résumé and hiring through Toptal`,
        `- ${link("GitHub", site.links.github)}: open-source Claude Code plugins`,
        `- ${link("LinkedIn", site.links.linkedin)}`,
        ""
    ].join("\n");
}
