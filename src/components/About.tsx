import Image from "next/image";

import { aboutParagraphs, numbers } from "@/content/about";
import { testimonials } from "@/content/testimonials";
import { quoteParagraphs } from "@/lib/format";
import { TOPTAL_SITE } from "@/lib/variant";

import { LinkedInIcon } from "./Icons";
import { Section } from "./Section";

const trackClient = (name: string) => ({
    "data-track": "testimonial_click",
    "data-track-client": name.toLowerCase().replaceAll(" ", "-")
});

function ClientPhoto({ src }: { src: string }) {
    return <Image src={src} alt="" width={48} height={48} className="size-10 shrink-0 rounded-full ring-1 ring-ink-faint/30 sm:size-12" />;
}

export function About() {
    return (
        <Section id="about">
            <div className="space-y-4">
                {aboutParagraphs.map(paragraph => (
                    <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                ))}
            </div>
            <dl className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {numbers.map(({ value, label }) => (
                    <div key={label} className="flex flex-col-reverse justify-end rounded-xl border border-ink-faint/15 bg-surface/60 p-4">
                        <dt className="mt-1 text-sm leading-snug text-ink-faint">{label}</dt>
                        <dd className="text-3xl display-name text-ink-strong">{value}</dd>
                    </div>
                ))}
            </dl>
            <h3 className="mt-12 text-sm font-medium text-ink-strong">{testimonials.heading}</h3>
            <ul className="mt-6 space-y-8">
                {testimonials.items.map(item => (
                    <li key={item.name}>
                        <figure className="border-l-2 border-ink-faint/20 pl-5">
                            <figcaption className="flex items-center gap-3 text-sm leading-snug">
                                {TOPTAL_SITE ? (
                                    <ClientPhoto src={item.avatar} />
                                ) : (
                                    // The name's link is the one a keyboard and a screen reader meet; the photo repeats it for the mouse.
                                    <a
                                        href={item.linkedin}
                                        {...trackClient(item.name)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        tabIndex={-1}
                                        aria-hidden="true"
                                        className="shrink-0 rounded-full transition hover:opacity-80"
                                    >
                                        <ClientPhoto src={item.avatar} />
                                    </a>
                                )}
                                <div className="text-pretty">
                                    {item.rating ? (
                                        <>
                                            <span className="mr-2 text-accent" aria-hidden="true">
                                                {"★".repeat(item.rating)}
                                            </span>
                                            <span className="sr-only">Rated {item.rating} out of 5.</span>
                                        </>
                                    ) : null}
                                    {TOPTAL_SITE ? (
                                        <span className="font-medium text-ink-strong">{item.name}</span>
                                    ) : (
                                        <a
                                            href={item.linkedin}
                                            {...trackClient(item.name)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={`${item.name} on LinkedIn (opens in a new tab)`}
                                            className="group font-medium text-ink-strong underline-offset-4 hover:underline focus-visible:underline"
                                        >
                                            {item.name}
                                            <LinkedInIcon className="ml-1.5 inline size-3.5 -translate-y-px text-ink-faint transition group-hover:text-ink-strong" />
                                        </a>
                                    )}
                                    {"project" in item ? (
                                        <span className="block text-ink-faint sm:inline">
                                            <span className="hidden sm:inline"> · </span>
                                            {item.project}
                                        </span>
                                    ) : null}
                                    <span className="mt-0.5 block text-ink-faint">{item.hired}</span>
                                </div>
                            </figcaption>
                            <blockquote className="mt-4 space-y-3">
                                {quoteParagraphs(item.quote).map(paragraph => (
                                    <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                                ))}
                            </blockquote>
                        </figure>
                    </li>
                ))}
            </ul>
        </Section>
    );
}
