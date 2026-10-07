import type { Metadata, Viewport } from "next";

import { ReportScript } from "@/components/ReportScript";
import { SampleBar } from "@/components/SampleBar";
import { samplePage } from "@/content/audit";
import { site } from "@/content/site";
import { auditOgImage } from "@/lib/og";
import { sampleReport } from "@/lib/sample-report";

const shared = `${samplePage.title} · ${site.domain}`;
const image = auditOgImage();

export const metadata: Metadata = {
    title: samplePage.title,
    description: samplePage.description,
    alternates: { canonical: samplePage.path },
    openGraph: {
        type: "website",
        url: `${site.url}${samplePage.path}`,
        siteName: site.domain,
        title: shared,
        description: samplePage.description,
        images: [image]
    },
    twitter: { card: "summary_large_image", title: shared, description: samplePage.description, images: [image] }
};

export const viewport: Viewport = { themeColor: "#f4f4f5", colorScheme: "light" };

// The report's own style is unlayered, so it wins over Tailwind's layers on this page: the report
// looks as exported. The bar takes the report's colours; the site's pointer light is for dark pages.
const BAR = `html{background:#f4f4f5;color-scheme:light}
.spotlight{display:none}
.sample-bar{max-width:880px;margin:0 auto;padding:1.5rem 1.25rem 0}
.sample-bar>div{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem 1.25rem;padding:1rem 1.25rem;background:#fff;border:1px solid var(--line);border-radius:10px}
.sample-bar p{margin:0;flex:1 1 22rem;color:var(--muted);font-size:.9rem}
.sample-bar nav{display:flex;flex-wrap:wrap;gap:.6rem}
.sample-bar a{display:inline-block;padding:.45rem .9rem;border-radius:8px;font-size:.9rem;font-weight:600;text-decoration:none}
.sample-bar a.primary{background:var(--accent);color:#fff}
.sample-bar a.secondary{border:1px solid var(--line);background:#fff;color:var(--ink)}
@media print{.sample-bar{display:none}}`;

const report = sampleReport();

export default function SampleReport() {
    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: `${report.style}\n${BAR}` }} />
            <SampleBar />
            <main id="content" className="doc" dangerouslySetInnerHTML={{ __html: report.main }} />
            <ReportScript code={report.script} />
        </>
    );
}
