import { aboutParagraphs, numbers } from "@/content/about";
import { testimonials } from "@/content/testimonials";

import { Section } from "./Section";

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
                            <blockquote>
                                <p>“{item.quote}”</p>
                            </blockquote>
                            <figcaption className="mt-3 text-sm leading-snug">
                                <span className="text-accent" aria-hidden="true">
                                    {"★".repeat(item.rating)}
                                </span>
                                <span className="sr-only">Rated {item.rating} out of 5.</span>
                                <span className="ml-2 font-medium text-ink-strong">{item.name}</span>
                                {"project" in item ? <span className="text-ink-faint"> · {item.project}</span> : null}
                                <span className="mt-0.5 block text-ink-faint">{item.hired}</span>
                            </figcaption>
                        </figure>
                    </li>
                ))}
            </ul>
        </Section>
    );
}
