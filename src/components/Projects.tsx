import Image from "next/image";

import { type Project, installCommands, marketplace, projects, projectsIntro } from "@/content/projects";
import { ui } from "@/content/ui";

import { Chips } from "./Chips";
import { CopyButton } from "./CopyButton";
import { ArrowUpRightIcon } from "./Icons";
import { Section } from "./Section";

function ProjectTitle({ project }: { project: Project }) {
    if (!project.url) return <h3 className="leading-snug font-medium text-ink-strong">{project.name}</h3>;
    return (
        <h3 className="leading-snug text-ink-strong">
            <a
                href={project.url}
                data-track="project_click"
                data-track-project={project.name}
                target="_blank"
                rel="noopener noreferrer"
                className="group/link font-medium hover:text-accent focus-visible:text-accent"
            >
                <span aria-hidden="true" className="absolute -inset-x-4 -inset-y-3 hidden rounded lg:-inset-x-6 lg:-inset-y-4 lg:block" />
                {project.name}
                <ArrowUpRightIcon className="ml-1 inline-block size-3.5 translate-y-px transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 motion-reduce:transition-none" />
            </a>
        </h3>
    );
}

export function Projects() {
    const commands = installCommands.join("\n");
    return (
        <Section id="projects">
            <p className="mb-10">{projectsIntro}</p>
            <ul className="group/list space-y-12">
                {projects.map(project => (
                    <li key={project.name}>
                        <article className="group relative grid gap-4 transition motion-reduce:transition-none sm:grid-cols-8 sm:gap-6 lg:group-hover/list:opacity-50 lg:hover:opacity-100!">
                            {project.url ? (
                                <div
                                    aria-hidden="true"
                                    className="absolute -inset-4 z-0 hidden rounded-xl border-l-2 border-transparent transition motion-reduce:transition-none lg:-inset-x-6 lg:block lg:group-hover:border-accent lg:group-hover:bg-surface/70"
                                />
                            ) : null}
                            <div className={`z-10 ${project.image ? "sm:order-2 sm:col-span-6" : "sm:col-span-8"}`}>
                                <ProjectTitle project={project} />
                                {project.note ? (
                                    <p className="mt-1 text-xs font-semibold tracking-wide text-ink-faint uppercase">{project.note}</p>
                                ) : null}
                                <p className="mt-2 text-sm leading-normal">{project.description}</p>
                                <Chips items={project.chips} label={`${project.name} is built with`} />
                            </div>
                            {project.image ? (
                                <figure className="z-10 sm:order-1 sm:col-span-2 sm:translate-y-1">
                                    <Image
                                        src={project.image.src}
                                        alt={project.image.alt}
                                        width={project.image.width}
                                        height={project.image.height}
                                        className="rounded border-2 border-ink-faint/20 transition group-hover:border-ink-faint/40"
                                    />
                                    <figcaption className="relative z-20 mt-1.5 text-[11px] leading-tight text-ink-faint">
                                        <a
                                            href={project.image.credit.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-ink-strong"
                                        >
                                            {project.image.credit.text}
                                        </a>
                                    </figcaption>
                                </figure>
                            ) : null}
                        </article>
                    </li>
                ))}
            </ul>
            <div className="mt-12">
                <p className="text-sm font-medium text-ink-strong">
                    {marketplace.lead}{" "}
                    <a
                        href={marketplace.url}
                        data-track="project_click"
                        data-track-project={marketplace.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/link font-mono underline decoration-ink-faint/50 underline-offset-4 hover:text-accent focus-visible:text-accent"
                    >
                        {marketplace.name}
                        <ArrowUpRightIcon className="ml-0.5 inline-block size-3.5 translate-y-px transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 motion-reduce:transition-none" />
                    </a>
                </p>
                <div className="relative mt-3 rounded-lg bg-surface py-4 pr-12 pl-4 font-mono text-[13px] leading-6 text-ink-strong">
                    <pre
                        tabIndex={0}
                        aria-label="Install commands"
                        className="overflow-x-auto rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                    >
                        <code>{commands}</code>
                    </pre>
                    <CopyButton text={commands} label={ui.copyInstall} trackAs="copy_install" className="absolute top-2 right-2" />
                </div>
            </div>
        </Section>
    );
}
