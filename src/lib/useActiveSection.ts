"use client";

import { useEffect, useState } from "react";

/**
 * The id crossing a band 30–40% down the viewport. Ids come in page order and the last one in the
 * band wins, so an entry inside a section (the Auditdesk project in Projects) beats its section; at
 * the foot of the page the last id wins, since a short last section never reaches the band. Pass a
 * stable array.
 */
export function useActiveSection(ids: readonly string[]): string | null {
    const [active, setActive] = useState<string | null>(ids[0] ?? null);

    useEffect(() => {
        const elements = ids.map(id => document.getElementById(id)).filter((element): element is HTMLElement => element !== null);
        if (elements.length === 0) return;
        const visible = new Map<string, boolean>();
        const atFoot = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
        const update = () => {
            const current = atFoot() ? elements[elements.length - 1].id : [...ids].reverse().find(id => visible.get(id));
            if (current) setActive(current);
        };
        const observer = new IntersectionObserver(
            entries => {
                for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
                update();
            },
            { rootMargin: "-30% 0px -60% 0px" }
        );
        elements.forEach(element => observer.observe(element));
        window.addEventListener("scroll", update, { passive: true });
        return () => {
            observer.disconnect();
            window.removeEventListener("scroll", update);
        };
    }, [ids]);

    return active;
}
