import type { Metadata } from "next";
import Link from "next/link";

import { privacy } from "@/content/privacy";
import { site } from "@/content/site";

export const metadata: Metadata = {
    title: privacy.title,
    description: privacy.description,
    alternates: { canonical: "/privacy" },
    openGraph: {
        type: "website",
        url: `${site.url}/privacy`,
        siteName: site.domain,
        title: `${privacy.title} · ${site.domain}`,
        description: privacy.description
    }
};

/** Renders "{email}" in the copy as a link to the contact address. */
function WithEmail({ text }: { text: string }) {
    const [before, after] = text.split("{email}");
    if (after === undefined) return <>{text}</>;
    return (
        <>
            {before}
            <a className="font-medium text-ink-strong underline underline-offset-4 hover:text-accent" href={`mailto:${site.email}`}>
                {site.email}
            </a>
            {after}
        </>
    );
}

export default function Privacy() {
    return (
        <main id="content" className="mx-auto max-w-2xl px-6 py-16 md:py-24">
            <p>
                <Link href="/" className="text-sm font-semibold text-ink-strong hover:text-accent">
                    ← {site.name}
                </Link>
            </p>
            <h1 className="mt-8 text-4xl display-name text-ink-strong">{privacy.title}</h1>
            <div className="mt-8 space-y-8">
                {privacy.sections.map(section => (
                    <section key={section.title}>
                        <h2 className="font-medium text-ink-strong">{section.title}</h2>
                        <div className="mt-2 space-y-3">
                            {section.paragraphs.map(paragraph => (
                                <p key={paragraph.slice(0, 40)}>
                                    <WithEmail text={paragraph} />
                                </p>
                            ))}
                        </div>
                    </section>
                ))}
                <p className="text-sm text-ink-faint">{privacy.updated}</p>
            </div>
        </main>
    );
}
