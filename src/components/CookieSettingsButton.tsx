"use client";

import { ui } from "@/content/ui";
import { GA_MEASUREMENT_ID, setConsent } from "@/lib/analytics";

/** Opens the consent banner again, so a choice can be withdrawn as easily as it was given. */
export function CookieSettingsButton() {
    if (!GA_MEASUREMENT_ID) return null;
    return (
        <>
            {" · "}
            <button
                type="button"
                onClick={() => setConsent(null)}
                className="font-medium text-ink hover:text-accent focus-visible:text-accent"
            >
                {ui.cookieSettings}
            </button>
        </>
    );
}
