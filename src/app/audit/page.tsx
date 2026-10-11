import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";

import { Lightbox, type Shot } from "@/components/Lightbox";
import { RefLink } from "@/components/RefLink";
import { audit } from "@/content/audit";
import { type Package, pricing } from "@/content/pricing";
import { site } from "@/content/site";
import { auditOgImage } from "@/lib/og";
import { TOPTAL_SITE } from "@/lib/variant";

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
const BUTTON =
    "rounded-md px-5 py-2.5 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none";
const PRIMARY = `${BUTTON} bg-accent text-canvas hover:bg-ink-strong`;
const SECONDARY = `${BUTTON} border border-ink-faint/40 text-ink-strong hover:border-accent hover:text-accent`;

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

/** The package's price, or during the launch offer its launch price beside the regular one, struck through. */
function Price({ item }: { item: Package }) {
    const { promo } = pricing;
    if (!promo) return <p className="mt-3 text-4xl font-semibold tracking-tight text-ink-strong">{item.price}</p>;
    return (
        <div className="mt-3">
            <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-4xl font-semibold tracking-tight text-ink-strong">
                    <span className="sr-only">{promo.now}: </span>
                    {item.promoPrice}
                </span>
                <s className="text-lg text-ink-faint">
                    <span className="sr-only">{promo.regular}: </span>
                    {item.price}
                </s>
            </p>
            <p className="mt-1 text-xs font-semibold text-accent">
                −{promo.percent}% · {promo.label}
            </p>
        </div>
    );
}

function PackageCard({ item }: { item: Package }) {
    return (
        <li
            className={`flex flex-col rounded-xl border p-6 ${item.recommended ? "border-accent bg-accent/5" : "border-ink-faint/25 bg-surface/60"}`}
        >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-lg font-semibold text-ink-strong">{item.name}</h3>
                {item.recommended ? (
                    <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">{pricing.recommended}</span>
                ) : null}
            </div>
            <Price item={item} />
            <p className="mt-3 text-sm text-ink-strong">{item.scope}</p>
            <p className="text-sm text-ink-faint">{item.time}</p>
            <p className="mt-4 text-sm">{item.fit}</p>
            <ul className="mt-4 flex-1 list-disc space-y-1.5 pl-5 text-sm marker:text-accent">
                {item.items.map(line => (
                    <li key={line}>{line}</li>
                ))}
            </ul>
            <RefLink
                href={pricing.href(item.id)}
                data-track="audit_order"
                data-track-placement={item.id}
                className={`mt-6 text-center ${item.recommended ? PRIMARY : SECONDARY}`}
            >
                {item.cta}
            </RefLink>
        </li>
    );
}

function Prices() {
    const { custom, faq } = pricing;
    return (
        <Section id="pricing" title={pricing.title}>
            <p className="mt-4 max-w-2xl">{pricing.lead}</p>
            <p className="mt-3 max-w-2xl text-sm text-ink-faint">{pricing.languages}</p>
            {pricing.promo ? (
                <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-accent/40 bg-accent/10 px-5 py-3 text-sm text-ink-strong">
                    <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-canvas">{pricing.promo.label}</span>
                    <span>{pricing.promo.text}</span>
                </p>
            ) : null}
            <ul className="mt-8 grid gap-5 md:grid-cols-3">
                {pricing.packages.map(item => (
                    <PackageCard key={item.id} item={item} />
                ))}
            </ul>
            <div className="mt-5 flex flex-col gap-4 rounded-xl border border-ink-faint/25 bg-surface/60 p-6 md:flex-row md:items-center">
                <div className="flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                        <h3 className="text-lg font-semibold text-ink-strong">{custom.name}</h3>
                        <span className="text-ink-faint">{custom.price}</span>
                    </div>
                    <p className="mt-2 text-sm">{custom.text}</p>
                </div>
                <RefLink
                    href={pricing.href(custom.id)}
                    data-track="audit_order"
                    data-track-placement={custom.id}
                    className={`text-center ${SECONDARY}`}
                >
                    {custom.cta}
                </RefLink>
            </div>
            <p className="mt-4 text-sm text-ink-faint">{pricing.note}</p>
            <h3 className="mt-12 text-lg font-medium text-ink-strong">{faq.title}</h3>
            <dl className="mt-4 max-w-2xl space-y-5">
                {faq.items.map(({ q, a }) => (
                    <div key={q}>
                        <dt className="font-medium text-ink-strong">{q}</dt>
                        <dd className="mt-1">{a}</dd>
                    </div>
                ))}
            </dl>
        </Section>
    );
}

export default function Audit() {
    const { hero, sample, steps, edge, coverage, deliverables, yourCode } = audit;
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
                    <RefLink href={sample.href} data-track="sample_report_click" data-track-placement="hero" className={PRIMARY}>
                        {hero.sample}
                    </RefLink>
                    {TOPTAL_SITE ? null : (
                        <a href="#pricing" data-track="prices_click" className={`${SECONDARY} toptal:hidden`}>
                            {hero.prices}
                        </a>
                    )}
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
                    <a href={sample.mdHref} download data-track="sample_md" data-track-placement="audit" className={LINK}>
                        {sample.md}
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

            <Section id="edge" title={edge.title}>
                <ul className="mt-6 grid gap-x-10 gap-y-7 md:grid-cols-2">
                    {edge.items.map(({ title, text }) => (
                        <li key={title}>
                            <h3 className="font-medium text-ink-strong">{title}</h3>
                            <p className="mt-1.5">{text}</p>
                        </li>
                    ))}
                </ul>
                {/* The repository's README leads to naidenko.dev, which now sells the audit: not from the Toptal host. */}
                {TOPTAL_SITE ? null : (
                    <p className="mt-7">
                        <a href={edge.github.href} data-track="github_auditdesk" className={LINK}>
                            {edge.github.label}
                        </a>
                    </p>
                )}
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
                    <p>
                        {coverage.evidence.text}{" "}
                        <a href={coverage.evidence.href} data-track="evidence_click" className={LINK}>
                            {coverage.evidence.source}
                        </a>
                    </p>
                </div>
            </Section>

            <Section id="your-code" title={yourCode.title}>
                <div className="mt-4 max-w-2xl space-y-3">
                    {yourCode.paragraphs.map(paragraph => (
                        <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                    ))}
                </div>
            </Section>
            {/* A visit in Toptal mode on naidenko.dev sees no prices either, as it sees no form. */}
            {TOPTAL_SITE ? null : (
                <div className="toptal:hidden">
                    <Prices />
                </div>
            )}
            <Lightbox shots={gallery} />
        </main>
    );
}
