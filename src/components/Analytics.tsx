"use client";

import { useEffect } from "react";

import { GOATCOUNTER_URL, eventFor, isExcluded, loadGoatCounter, startVisit, track } from "@/lib/analytics";

export function Analytics() {
    useEffect(() => {
        if (isExcluded(window)) return;
        const stop = startVisit(window);
        // Capture phase, so a click is recorded before a link takes the visitor away.
        const onClick = (event: MouseEvent) => {
            const found = eventFor(event.target);
            if (found) track(found.name, found.params);
        };
        document.addEventListener("click", onClick, true);
        const goatcounter = GOATCOUNTER_URL ? loadGoatCounter(document, GOATCOUNTER_URL) : null;
        return () => {
            stop();
            document.removeEventListener("click", onClick, true);
            goatcounter?.remove();
        };
    }, []);

    return null;
}
