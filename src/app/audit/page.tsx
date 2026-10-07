import type { Metadata } from "next";
import Link from "next/link";

import { WithEmail } from "@/components/WithEmail";
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

export default function Audit() {
    return (
        <main id="content" className="mx-auto max-w-2xl px-6 py-16 md:py-24">
            <p>
                <Link href="/" className="text-sm font-semibold text-ink-strong hover:text-accent">
                    ← {site.name}
                </Link>
            </p>
            <h1 className="mt-8 text-4xl display-name text-ink-strong">{audit.title}</h1>
            <p className="mt-6">{audit.lead}</p>
            <div className="mt-8 space-y-8">
                {audit.sections.map(section => (
                    <section key={section.title}>
                        <h2 className="font-medium text-ink-strong">{section.title}</h2>
                        <div className="mt-2 space-y-3">
                            {section.paragraphs.map(paragraph => (
                                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                            ))}
                        </div>
                    </section>
                ))}
                <details className="rounded border border-ink-faint/20 p-4">
                    <summary data-track="audit_order" className="cursor-pointer font-semibold text-ink-strong hover:text-accent">
                        {audit.order.label}
                    </summary>
                    <p className="mt-3">{audit.order.toptal}</p>
                    <p className="mt-2">
                        <WithEmail text={audit.order.note} />
                    </p>
                    <p className="mt-2">
                        <Link href="/#contact" className="font-medium text-ink-strong underline underline-offset-4 hover:text-accent">
                            {audit.order.form}
                        </Link>
                    </p>
                </details>
            </div>
        </main>
    );
}
