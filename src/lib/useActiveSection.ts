"use client";

import { useEffect, useState } from "react";

/**
 * The id in view. The address's #id wins while its element stays in the top 40% of the viewport:
 * a menu jump parks a short entry (the code-audit service) where its section starts, above the
 * band, so geometry alone cannot tell "Services" from "Code audit". Otherwise it is the id crossing
 * a band 30–40% down the viewport: ids come in page order and the last one in the band wins, so an
 * entry inside a section beats its section; at the foot of the page the last id wins, since a short
 * last section never reaches the band. Pass a stable array.
 */
export function useActiveSection(ids: readonly string[]): string | null {
    const [active, setActive] = useState<string | null>(ids[0] ?? null);

    useEffect(() => {
        const elements = ids.map(id => document.getElementById(id)).filter((element): element is HTMLElement => element !== null);
        if (elements.length === 0) return;
        const visible = new Map<string, boolean>();
        const atFoot = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
        const jumpedTo = () => {
            const target = elements.find(element => `#${element.id}` === window.location.hash);
            if (!target) return undefined;
            const { top, bottom } = target.getBoundingClientRect();
            return top < window.innerHeight * 0.4 && bottom > 0 ? target.id : undefined;
        };
        const update = () => {
            const current = jumpedTo() ?? (atFoot() ? elements[elements.length - 1].id : [...ids].reverse().find(id => visible.get(id)));
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
        window.addEventListener("hashchange", update);
        return () => {
            observer.disconnect();
            window.removeEventListener("scroll", update);
            window.removeEventListener("hashchange", update);
        };
    }, [ids]);

    return active;
}
