import { RefLink } from "@/components/RefLink";
import { audit, samplePage } from "@/content/audit";

/** Above the sample report: what was audited, the way to the audit page, and the PDF (D8). */
export function SampleBar() {
    return (
        <aside className="sample-bar" aria-label="About this sample">
            <div>
                <p>{samplePage.note}</p>
                <nav aria-label="Sample report">
                    <RefLink href={audit.path} data-track="sample_to_audit" className="primary">
                        {samplePage.about}
                    </RefLink>
                    <a href={audit.sample.pdfHref} download data-track="sample_pdf" data-track-placement="sample" className="secondary">
                        {samplePage.pdf}
                    </a>
                </nav>
            </div>
        </aside>
    );
}
