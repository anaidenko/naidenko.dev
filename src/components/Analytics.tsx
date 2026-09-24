"use client";

import Script from "next/script";
import { useEffect } from "react";

import { GOATCOUNTER_URL, eventFor, track, trackView } from "@/lib/analytics";

export function Analytics() {
    useEffect(() => {
        trackView();
        // Capture phase, so a click is recorded before a link takes the visitor away.
        const onClick = (event: MouseEvent) => {
            const found = eventFor(event.target);
            if (found) track(found.name, found.params);
        };
        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
    }, []);

    if (!GOATCOUNTER_URL) return null;
    return <Script data-goatcounter={GOATCOUNTER_URL} src="https://gc.zgo.at/count.js" strategy="afterInteractive" />;
}
