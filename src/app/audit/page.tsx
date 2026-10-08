import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";

import { Lightbox, type Shot } from "@/components/Lightbox";
import { RefLink } from "@/components/RefLink";
import { audit } from "@/content/audit";
import { site } from "@/content/site";
import { auditOgImage } from "@/lib/og";

const shared = `${audit.title} · ${site.domain}`;
const image = auditOgImage();

// A page's openGraph and twitter replace the layout's whole objects, the image included.
export const metadata: Metadata = {
    title: audit.title,
    description: audit.description,
    alternates: { canonical: audit.path },
    openGraph: {
        type: "website",
        url: `${site.url}${audit.path}`,
        siteName: site.domain,
        title: shared,
        description: audit.description,
        images: [image]
    },
    twitter: { card: "summary_large_image", title: shared, description: audit.description, images: [image] }
};

const LINK = "font-medium text-ink-strong underline underline-offset-4 hover:text-accent";

function Screenshot({ shot, link, preload = false }: { shot: Shot; link: (image: ReactNode) => ReactNode; preload?: boolean }) {
    return (
        <figure>
            {link(
                <Image
                    src={shot.src}
                    alt={shot.alt}
                    width={shot.width}
                    height={shot.height}
                    preload={preload}
                    className="h-auto w-full rounded-lg border border-ink-faint/20 transition hover:border-ink-faint/50 motion-reduce:transition-none"
                />
            )}
            <figcaption className="mt-3 text-sm text-ink-faint">{shot.alt}</figcaption>
        </figure>
    );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
    return (
        <section id={id} className="mt-20">
            <h2 className="text-2xl font-semibold tracking-tight text-ink-strong">{title}</h2>
            {children}
        </section>
    );
}

export default function Audit() {
    const { hero, sample, steps, coverage, deliverables, yourCode } = audit;
    const gallery = steps.items.flatMap(({ shot }) => (shot ? [shot] : []));
    return (
        <main id="content" className="mx-auto max-w-4xl px-6 py-16 md:py-24">
            <header>
                <p>
                    {/* nofollow: crawlers that follow a Toptal link here stop short of the contact form. */}
                    <RefLink href="/" rel="nofollow" className="text-sm font-semibold text-ink-strong hover:text-accent">
                        ← {site.name}
                    </RefLink>
                </p>
                <h1 className="mt-8 text-4xl display-name text-ink-strong">{audit.title}</h1>
                <p className="mt-6 max-w-2xl text-2xl leading-snug text-ink-strong">{hero.lead}</p>
                <p className="mt-4 max-w-2xl">{hero.text}</p>
                <p className="mt-8 flex flex-wrap gap-3">
                    <RefLink
                        href={sample.href}
                        data-track="sample_report_click"
                        data-track-placement="hero"
                        className="rounded-md bg-accent px-5 py-2.5 font-semibold text-canvas transition hover:bg-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
                    >
                        {hero.sample}
                    </RefLink>
                </p>
                <div className="mt-12">
                    <Screenshot
                        shot={hero.shot}
                        preload
                        link={picture => (
                            <RefLink
                                href={sample.href}
                                data-track="sample_report_click"
                                data-track-placement="screenshot"
                                aria-label={sample.link}
                                className="block"
                            >
                                {picture}
                            </RefLink>
                        )}
                    />
                </div>
            </header>

            <Section id="sample" title={sample.title}>
                <p className="mt-4 max-w-2xl">{sample.text}</p>
                <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                    <RefLink href={sample.href} data-track="sample_report_click" data-track-placement="section" className={LINK}>
                        {sample.link}
                    </RefLink>
                    <a href={sample.pdfHref} download data-track="sample_pdf" data-track-placement="audit" className={LINK}>
                        {sample.pdf}
                    </a>
                </p>
            </Section>

            <Section id="how" title={steps.title}>
                <ol className="mt-6 space-y-14">
                    {steps.items.map(({ title, text, shot }, index) => (
                        <li key={title}>
                            <h3 className="text-lg font-medium text-ink-strong">
                                <span className="mr-2 text-accent">{index + 1}.</span>
                                {title}
                            </h3>
                            <p className="mt-2 max-w-2xl">{text}</p>
                            {shot ? (
                                <div className="mt-6">
                                    <Screenshot
                                        shot={shot}
                                        link={picture => (
                                            <a href={shot.src} data-lightbox={gallery.indexOf(shot)} className="block">
                                                {picture}
                                            </a>
                                        )}
                                    />
                                </div>
                            ) : null}
                        </li>
                    ))}
                </ol>
            </Section>

            <Section id="deliverables" title={deliverables.title}>
                <ul className="mt-4 max-w-2xl list-disc space-y-2 pl-5 marker:text-accent">
                    {deliverables.items.map(item => (
                        <li key={item.slice(0, 40)}>{item}</li>
                    ))}
                </ul>
            </Section>

            <Section id="coverage" title={coverage.title}>
                <div className="mt-4 max-w-2xl space-y-3">
                    {coverage.paragraphs.map(paragraph => (
                        <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                    ))}
                </div>
            </Section>

            <Section id="your-code" title={yourCode.title}>
                <div className="mt-4 max-w-2xl space-y-3">
                    {yourCode.paragraphs.map(paragraph => (
                        <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                    ))}
                </div>
            </Section>
            <Lightbox shots={gallery} />
        </main>
    );
}
