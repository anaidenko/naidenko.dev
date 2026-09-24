import { earlierExperience, experience, fullResume } from "@/content/experience";

import { ExperienceItem } from "./ExperienceItem";
import { ArrowUpRightIcon, ChevronDownIcon } from "./Icons";
import { Section } from "./Section";

const earliestYear = earlierExperience.at(-1)?.period.slice(0, 4);
const latestEarlierYear = earlierExperience[0]?.period.slice(-4);

export function Experience() {
    return (
        <Section id="experience">
            <ol className="group/list space-y-12">
                {experience.map(entry => (
                    <li key={entry.company}>
                        <ExperienceItem entry={entry} />
                    </li>
                ))}
            </ol>
            <details className="group/earlier mt-12">
                <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink-strong hover:text-accent focus-visible:text-accent [&::-webkit-details-marker]:hidden">
                    Earlier experience, {earliestYear} — {latestEarlierYear}
                    <ChevronDownIcon className="size-4 transition-transform group-open/earlier:rotate-180 motion-reduce:transition-none" />
                </summary>
                <ol className="group/list mt-10 space-y-12">
                    {earlierExperience.map(entry => (
                        <li key={entry.company}>
                            <ExperienceItem entry={entry} />
                        </li>
                    ))}
                </ol>
            </details>
            <p className="mt-12">
                <a
                    href={fullResume.url}
                    data-track="toptal_profile_click"
                    data-track-placement="resume_link"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center font-semibold text-ink-strong hover:text-accent focus-visible:text-accent"
                >
                    {fullResume.label}
                    <ArrowUpRightIcon className="ml-1 size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" />
                </a>
            </p>
        </Section>
    );
}
