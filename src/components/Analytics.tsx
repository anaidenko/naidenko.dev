"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { GOATCOUNTER_URL, eventFor, isExcluded, loadGoatCounter, startVisit, track } from "@/lib/analytics";
import { TOPTAL_SITE } from "@/lib/variant";

export function Analytics() {
    const pathname = usePathname();
    const goatcounterLoaded = useRef(false);

    // A move between pages keeps this layout mounted, so each page is started (and the last one
    // ended) here rather than on load. GoatCounter's script counts only the page it loads on.
    useEffect(() => {
        if (isExcluded(window)) return;
        const end = startVisit(window, TOPTAL_SITE);
        if (!GOATCOUNTER_URL) return end;
        if (goatcounterLoaded.current) window.goatcounter?.count?.({ path: pathname });
        else {
            loadGoatCounter(document, GOATCOUNTER_URL);
            goatcounterLoaded.current = true;
        }
        return end;
    }, [pathname]);

    useEffect(() => {
        // Capture phase, so a click is recorded before a link takes the visitor away.
        const onClick = (event: MouseEvent) => {
            const found = eventFor(event.target);
            if (found) track(found.name, found.params);
        };
        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
    }, []);

    return null;
}
