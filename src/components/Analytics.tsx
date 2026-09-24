"use client";

import Script from "next/script";
import { useEffect, useSyncExternalStore } from "react";

import { GA_MEASUREMENT_ID, eventFor, getConsent, setConsent, subscribeConsent, track } from "@/lib/analytics";

import { ConsentBanner } from "./ConsentBanner";

/** Before hydration the stored choice is unknown, so nothing renders (no banner flash for returning visitors). */
const PENDING = "pending";
const pending = () => PENDING;

export function Analytics() {
    const consent = useSyncExternalStore(subscribeConsent, getConsent, pending);

    useEffect(() => {
        if (!GA_MEASUREMENT_ID) return;
        // Capture phase, so a click is recorded before a link takes the visitor away.
        const onClick = (event: MouseEvent) => {
            const found = eventFor(event.target);
            if (found) track(found.name, found.params);
        };
        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
    }, []);

    if (!GA_MEASUREMENT_ID || consent === PENDING || consent === "denied") return null;
    if (consent === null) return <ConsentBanner onChoose={setConsent} />;
    return (
        <>
            <Script id="ga-init" strategy="afterInteractive">
                {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" });
gtag("consent", "update", { analytics_storage: "granted" });
gtag("js", new Date());
gtag("config", "${GA_MEASUREMENT_ID}");`}
            </Script>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
        </>
    );
}
