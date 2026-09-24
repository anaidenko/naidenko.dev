import type { ReactNode } from "react";

import { type SectionId, sections } from "@/content/sections";

export function Section({ id, children }: { id: SectionId; children: ReactNode }) {
    const label = sections.find(section => section.id === id)?.label ?? id;
    return (
        <section id={id} aria-label={label} className="mb-16 scroll-mt-16 md:mb-24 lg:mb-32 lg:scroll-mt-24">
            <div className="sticky top-0 z-20 -mx-6 mb-4 bg-canvas/80 px-6 py-5 backdrop-blur md:-mx-12 md:px-12 lg:sr-only">
                <h2 className="text-sm font-bold tracking-widest text-ink-strong uppercase">{label}</h2>
            </div>
            {children}
        </section>
    );
}
